package data

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"cloud.google.com/go/spanner"
)

// ExpectedConfig represents the expected values for database validation
type ExpectedConfig struct {
	Tables map[string]TableExpected `yaml:"tables"`
}

// TableExpected represents expected data for a table
type TableExpected struct {
	Count   int                    `yaml:"count"`
	Sample  map[string]interface{} `yaml:"sample,omitempty"`
	Columns map[string]interface{} `yaml:"columns,omitempty"`
}

// ValidationResult represents the result of database validation
type ValidationResult struct {
	DatabaseID  string                           `json:"database_id"`
	Success     bool                             `json:"success"`
	Results     map[string]TableValidationResult `json:"results"`
	Errors      []string                         `json:"errors,omitempty"`
	Performance *PerformanceMetrics              `json:"performance,omitempty"`
}

// TableValidationResult represents the result of table validation
type TableValidationResult struct {
	TableName string   `json:"table_name"`
	RowCount  int64    `json:"row_count"`
	Success   bool     `json:"success"`
	Messages  []string `json:"messages,omitempty"`
	Errors    []string `json:"errors,omitempty"`
}

// ValidateTable validates a single table against expected data
func ValidateTable(ctx context.Context, client *spanner.Client, tableName string, expected TableExpected) TableValidationResult {
	result := TableValidationResult{
		TableName: tableName,
		Success:   true,
		Messages:  []string{},
		Errors:    []string{},
	}

	// Validate table name to prevent SQL injection
	if err := validateIdentifier(tableName, "table name"); err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Invalid table name: %v", err))
		return result
	}

	// Count rows using safe identifier quoting
	stmt := spanner.NewStatement(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", escapeIdentifier(tableName)))
	iter := client.Single().Query(ctx, stmt)
	defer iter.Stop()

	row, err := iter.Next()
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to query table: %v", err))
		return result
	}

	var count int64
	if err := row.Columns(&count); err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to read count: %v", err))
		return result
	}

	result.RowCount = count

	// Validate count
	if int64(expected.Count) != count {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Expected %d rows but found %d rows", expected.Count, count))
	} else {
		result.Messages = append(result.Messages, fmt.Sprintf("Row count matches: %d rows", count))
	}

	// Validate sample data if specified
	if len(expected.Sample) > 0 && count > 0 {
		if err := validateSampleData(ctx, client, tableName, expected.Sample, &result); err != nil {
			result.Success = false
			result.Errors = append(result.Errors, fmt.Sprintf("Sample data validation failed: %v", err))
		} else {
			result.Messages = append(result.Messages, "Sample data matches")
		}
	}

	// Validate all columns if specified
	if len(expected.Columns) > 0 && count > 0 {
		if err := validateAllColumns(ctx, client, tableName, expected.Columns, &result); err != nil {
			result.Success = false
			result.Errors = append(result.Errors, fmt.Sprintf("Column validation failed: %v", err))
		} else {
			result.Messages = append(result.Messages, "All columns match expected values")
		}
	}

	return result
}

func validateSampleData(ctx context.Context, client *spanner.Client, tableName string, expectedData map[string]interface{}, result *TableValidationResult) error {
	// Build a query to check if sample data exists
	var conditions []string
	var params []interface{}
	paramIndex := 1

	for field, value := range expectedData {
		conditions = append(conditions, fmt.Sprintf("%s = @p%d", field, paramIndex))
		params = append(params, value)
		paramIndex++
	}

	// Validate table name to prevent SQL injection
	if err := validateIdentifier(tableName, "table name"); err != nil {
		return fmt.Errorf("invalid table name: %v", err)
	}

	query := fmt.Sprintf("SELECT COUNT(*) FROM `%s` WHERE %s", escapeIdentifier(tableName), strings.Join(conditions, " AND "))
	stmt := spanner.NewStatement(query)

	// Set parameters
	for i, param := range params {
		stmt.Params[fmt.Sprintf("p%d", i+1)] = param
	}

	iter := client.Single().Query(ctx, stmt)
	defer iter.Stop()

	row, err := iter.Next()
	if err != nil {
		return fmt.Errorf("query failed: %v", err)
	}

	var count int64
	if err := row.Columns(&count); err != nil {
		return fmt.Errorf("failed to read count: %v", err)
	}

	if count == 0 {
		return fmt.Errorf("sample data not found in table")
	}

	return nil
}

func validateAllColumns(ctx context.Context, client *spanner.Client, tableName string, expectedColumns map[string]interface{}, result *TableValidationResult) error {
	// Query only the columns we need to validate
	var columnNames []string
	for colName := range expectedColumns {
		columnNames = append(columnNames, colName)
	}

	if len(columnNames) == 0 {
		return fmt.Errorf("no columns specified for validation")
	}

	// Validate all column names to prevent SQL injection
	for _, colName := range columnNames {
		if err := validateIdentifier(colName, "column name"); err != nil {
			return fmt.Errorf("invalid column name %s: %v", colName, err)
		}
	}

	// Build query with safe identifier quoting
	var safeColumns []string
	for _, colName := range columnNames {
		safeColumns = append(safeColumns, fmt.Sprintf("`%s`", escapeIdentifier(colName)))
	}
	stmt := spanner.NewStatement(fmt.Sprintf("SELECT %s FROM `%s` LIMIT 1", strings.Join(safeColumns, ", "), escapeIdentifier(tableName)))
	iter := client.Single().Query(ctx, stmt)
	defer iter.Stop()

	row, err := iter.Next()
	if err != nil {
		return fmt.Errorf("failed to query table: %v", err)
	}

	// Create a map of actual column values
	actualValues := make(map[string]interface{})

	// Read each column value with proper type handling
	for i, colName := range columnNames {
		var value interface{}

		// Try to determine the type from the expected value
		expectedValue := expectedColumns[colName]
		switch expectedValue.(type) {
		case string:
			var stringVal *string
			if err := row.Column(i, &stringVal); err != nil {
				return fmt.Errorf("failed to read string column %s: %v", colName, err)
			}
			if stringVal != nil {
				value = *stringVal
			}
		case int:
			var intVal *int64
			if err := row.Column(i, &intVal); err != nil {
				return fmt.Errorf("failed to read int column %s: %v", colName, err)
			}
			if intVal != nil {
				value = int(*intVal)
			}
		case float64:
			var floatVal *float64
			if err := row.Column(i, &floatVal); err != nil {
				return fmt.Errorf("failed to read float64 column %s: %v", colName, err)
			}
			if floatVal != nil {
				value = *floatVal
			}
		case bool:
			var boolVal *bool
			if err := row.Column(i, &boolVal); err != nil {
				return fmt.Errorf("failed to read bool column %s: %v", colName, err)
			}
			if boolVal != nil {
				value = *boolVal
			}
		default:
			// Fallback: try as string
			var stringVal *string
			if err := row.Column(i, &stringVal); err != nil {
				return fmt.Errorf("failed to read column %s: %v", colName, err)
			}
			if stringVal != nil {
				value = *stringVal
			}
		}

		actualValues[colName] = value
	}

	// Compare expected values with actual values
	var mismatches []string
	for expectedColumn, expectedValue := range expectedColumns {
		actualValue, exists := actualValues[expectedColumn]
		if !exists {
			mismatches = append(mismatches, fmt.Sprintf("Column %s not found in table", expectedColumn))
			continue
		}

		// Handle type conversions and comparisons
		if !CompareValues(expectedValue, actualValue) {
			mismatches = append(mismatches, fmt.Sprintf("Column %s: expected %v (type: %T), got %v (type: %T)",
				expectedColumn, expectedValue, expectedValue, actualValue, actualValue))
		}
	}

	if len(mismatches) > 0 {
		return fmt.Errorf("column mismatches found: %s", strings.Join(mismatches, "; "))
	}

	return nil
}

// CompareValues compares two values with type conversion handling
func CompareValues(expected, actual interface{}) bool {
	// Handle nil values
	if expected == nil && actual == nil {
		return true
	}
	if expected == nil || actual == nil {
		return false
	}

	// Convert both values to strings for comparison to handle type differences
	expectedStr := fmt.Sprintf("%v", expected)
	actualStr := fmt.Sprintf("%v", actual)

	return expectedStr == actualStr
}

// validateIdentifier validates that an identifier (table/column name) is safe to use in SQL
func validateIdentifier(identifier, identifierType string) error {
	if identifier == "" {
		return fmt.Errorf("%s cannot be empty", identifierType)
	}

	// Check length limits (Spanner identifier limit is 128 characters)
	if len(identifier) > 128 {
		return fmt.Errorf("%s exceeds maximum length of 128 characters", identifierType)
	}

	// Allow alphanumeric characters, underscores, and hyphens
	// This matches Spanner's identifier naming rules
	validPattern := regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]*$`)
	if !validPattern.MatchString(identifier) {
		return fmt.Errorf("%s contains invalid characters (must start with letter, contain only letters, numbers, underscores, hyphens)", identifierType)
	}

	return nil
}

// escapeIdentifier escapes an identifier for safe use in SQL
// This function escapes backticks within identifiers
func escapeIdentifier(identifier string) string {
	// Escape any existing backticks by doubling them
	return strings.ReplaceAll(identifier, "`", "``")
}
