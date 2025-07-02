package data

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"cloud.google.com/go/spanner"
	"google.golang.org/api/iterator"
)

// BatchValidator performs optimized validation of multiple tables using batch queries
type BatchValidator struct {
	client  *spanner.Client
	tracker *PerformanceTracker
}

// NewBatchValidator creates a new batch validator
func NewBatchValidator(client *spanner.Client) *BatchValidator {
	return &BatchValidator{
		client:  client,
		tracker: NewPerformanceTracker(),
	}
}

// BatchValidationResult contains results for multiple table validations
type BatchValidationResult struct {
	DatabaseID  string                           `json:"database_id"`
	Success     bool                             `json:"success"`
	Results     map[string]TableValidationResult `json:"results"`
	Errors      []string                         `json:"errors,omitempty"`
	Performance PerformanceMetrics               `json:"performance,omitempty"`
}

// ValidateTablesInBatch performs optimized validation of multiple tables
func (bv *BatchValidator) ValidateTablesInBatch(ctx context.Context, expectedConfig ExpectedConfig) (*BatchValidationResult, error) {
	result := &BatchValidationResult{
		Success: true,
		Results: make(map[string]TableValidationResult),
		Errors:  []string{},
	}

	// Step 1: Batch count all tables in a single query
	bv.tracker.TrackQuery() // Single batched query for all table counts
	tableCounts, err := bv.batchCountTables(ctx, expectedConfig)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to batch count tables: %v", err))
		result.Success = false
		return result, err
	}

	// Step 2: Validate counts and prepare for column validation
	tablesToValidateColumns := make(map[string]TableExpected)
	
	for tableName, expected := range expectedConfig.Tables {
		tableResult := TableValidationResult{
			TableName: tableName,
			Success:   true,
			Messages:  []string{},
			Errors:    []string{},
		}

		// Check count from batch result
		if count, exists := tableCounts[tableName]; exists {
			tableResult.RowCount = count
			
			if int64(expected.Count) != count {
				tableResult.Success = false
				tableResult.Errors = append(tableResult.Errors, 
					fmt.Sprintf("Expected %d rows but found %d rows", expected.Count, count))
			} else {
				tableResult.Messages = append(tableResult.Messages, 
					fmt.Sprintf("Row count matches: %d rows", count))
			}
		} else {
			tableResult.Success = false
			tableResult.Errors = append(tableResult.Errors, "Table not found in database")
		}

		// If table has data and column validation is needed, add to batch
		if tableResult.RowCount > 0 && (len(expected.Sample) > 0 || len(expected.Columns) > 0) {
			tablesToValidateColumns[tableName] = expected
		}

		result.Results[tableName] = tableResult
		if !tableResult.Success {
			result.Success = false
		}
	}

	// Step 3: Batch validate columns for tables that need it
	if len(tablesToValidateColumns) > 0 {
		// Track queries for column validation (concurrent queries)
		for range tablesToValidateColumns {
			bv.tracker.TrackQuery() // One query per table for column validation
		}
		columnValidationResults, err := bv.batchValidateColumns(ctx, tablesToValidateColumns)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to batch validate columns: %v", err))
			result.Success = false
		} else {
			// Merge column validation results
			for tableName, columnResult := range columnValidationResults {
				if tableResult, exists := result.Results[tableName]; exists {
					tableResult.Messages = append(tableResult.Messages, columnResult.Messages...)
					tableResult.Errors = append(tableResult.Errors, columnResult.Errors...)
					if !columnResult.Success {
						tableResult.Success = false
						result.Success = false
					}
					result.Results[tableName] = tableResult
				}
			}
		}
	}

	// Add performance metrics to result
	result.Performance = bv.tracker.GetMetrics(len(expectedConfig.Tables), true)

	return result, nil
}

// batchCountTables counts rows for multiple tables in a single query using UNION ALL
func (bv *BatchValidator) batchCountTables(ctx context.Context, expectedConfig ExpectedConfig) (map[string]int64, error) {
	if len(expectedConfig.Tables) == 0 {
		return make(map[string]int64), nil
	}

	// Validate all table names first
	var tableNames []string
	for tableName := range expectedConfig.Tables {
		if err := validateIdentifier(tableName, "table name"); err != nil {
			return nil, fmt.Errorf("invalid table name %s: %v", tableName, err)
		}
		tableNames = append(tableNames, tableName)
	}

	// First, check which tables exist
	existingTables, err := bv.getExistingTables(ctx, tableNames)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing tables: %w", err)
	}

	counts := make(map[string]int64)
	
	// Set count to 0 for non-existing tables
	for _, tableName := range tableNames {
		if !existingTables[tableName] {
			counts[tableName] = 0
		}
	}

	// If no tables exist, return early
	if len(existingTables) == 0 {
		return counts, nil
	}

	// Build a UNION query to count only existing tables
	var unionParts []string
	for _, tableName := range tableNames {
		if existingTables[tableName] {
			escapedName := escapeIdentifier(tableName)
			unionPart := fmt.Sprintf("SELECT '%s' as table_name, COUNT(*) as row_count FROM `%s`", 
				tableName, escapedName)
			unionParts = append(unionParts, unionPart)
		}
	}

	if len(unionParts) == 0 {
		return counts, nil
	}

	query := strings.Join(unionParts, " UNION ALL ")
	stmt := spanner.NewStatement(query)

	iter := bv.client.Single().Query(ctx, stmt)
	defer iter.Stop()

	for {
		row, err := iter.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}
			return nil, fmt.Errorf("error reading batch count results: %w", err)
		}

		var tableName string
		var rowCount int64
		if err := row.Columns(&tableName, &rowCount); err != nil {
			return nil, fmt.Errorf("error parsing batch count row: %w", err)
		}

		counts[tableName] = rowCount
	}

	return counts, nil
}

// getExistingTables checks which tables exist in the database
func (bv *BatchValidator) getExistingTables(ctx context.Context, tableNames []string) (map[string]bool, error) {
	if len(tableNames) == 0 {
		return make(map[string]bool), nil
	}

	// Query information_schema to check which tables exist
	placeholders := make([]string, len(tableNames))
	for i := range tableNames {
		placeholders[i] = fmt.Sprintf("@table%d", i)
	}
	
	query := fmt.Sprintf(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = '' AND table_name IN (%s)
	`, strings.Join(placeholders, ", "))
	
	stmt := spanner.NewStatement(query)
	for i, tableName := range tableNames {
		stmt.Params[fmt.Sprintf("table%d", i)] = tableName
	}

	iter := bv.client.Single().Query(ctx, stmt)
	defer iter.Stop()

	existingTables := make(map[string]bool)
	for {
		row, err := iter.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}
			return nil, fmt.Errorf("error checking existing tables: %w", err)
		}

		var tableName string
		if err := row.Columns(&tableName); err != nil {
			return nil, fmt.Errorf("error parsing table name: %w", err)
		}

		existingTables[tableName] = true
	}

	return existingTables, nil
}

// batchValidateColumns validates columns for multiple tables using concurrent queries
func (bv *BatchValidator) batchValidateColumns(ctx context.Context, tablesToValidate map[string]TableExpected) (map[string]TableValidationResult, error) {
	results := make(map[string]TableValidationResult)
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstError error

	// Limit concurrent queries to avoid overwhelming the database
	semaphore := make(chan struct{}, 5) // Max 5 concurrent queries

	for tableName, expected := range tablesToValidate {
		wg.Add(1)
		go func(tableName string, expected TableExpected) {
			defer wg.Done()
			
			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			tableResult := TableValidationResult{
				TableName: tableName,
				Success:   true,
				Messages:  []string{},
				Errors:    []string{},
			}

			// Validate sample data if specified
			if len(expected.Sample) > 0 {
				if err := validateSampleData(ctx, bv.client, tableName, expected.Sample, &tableResult); err != nil {
					tableResult.Success = false
					tableResult.Errors = append(tableResult.Errors, fmt.Sprintf("Sample data validation failed: %v", err))
				} else {
					tableResult.Messages = append(tableResult.Messages, "Sample data matches")
				}
			}

			// Validate all columns if specified
			if len(expected.Columns) > 0 {
				if err := validateAllColumns(ctx, bv.client, tableName, expected.Columns, &tableResult); err != nil {
					tableResult.Success = false
					tableResult.Errors = append(tableResult.Errors, fmt.Sprintf("Column validation failed: %v", err))
				} else {
					tableResult.Messages = append(tableResult.Messages, "All columns match expected values")
				}
			}

			// Store result safely
			mu.Lock()
			results[tableName] = tableResult
			if !tableResult.Success && firstError == nil {
				firstError = fmt.Errorf("column validation failed for table %s", tableName)
			}
			mu.Unlock()
		}(tableName, expected)
	}

	wg.Wait()

	return results, firstError
}