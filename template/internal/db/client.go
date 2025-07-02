package db

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"

	"cloud.google.com/go/spanner"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"

	"e2e-sandbox/internal/config"
)

// SpannerManager manages Spanner database client
// It implements the DatabaseManager interface
type SpannerManager struct {
	config          *config.DatabaseConfig
	client          *spanner.Client
	schemaMap       map[string]map[string]string
	mutationBuilder *MutationBuilder
}

// Ensure SpannerManager implements DatabaseManager interface
var _ DatabaseManager = (*SpannerManager)(nil)

// NewSpannerManager creates a new SpannerManager
func NewSpannerManager(ctx context.Context, dbConfig *config.DatabaseConfig) (*SpannerManager, error) {
	// Create Spanner client
	client, err := spanner.NewClient(ctx, dbConfig.DatabasePath())
	if err != nil {
		return nil, fmt.Errorf("failed to create Spanner client: %v", err)
	}

	sm := &SpannerManager{
		config:          dbConfig,
		client:          client,
		schemaMap:       make(map[string]map[string]string),
	}
	sm.mutationBuilder = NewMutationBuilder(sm.schemaMap)

	return sm, nil
}

// Close closes the Spanner client
func (sm *SpannerManager) Close() error {
	if sm.client != nil {
		sm.client.Close()
	}
	return nil
}

// Client returns the Spanner client
func (sm *SpannerManager) Client() *spanner.Client {
	return sm.client
}


// ListTables returns all table names in the database
func (sm *SpannerManager) ListTables(ctx context.Context) ([]string, error) {
	stmt := spanner.NewStatement("SELECT table_name FROM information_schema.tables WHERE table_schema = '' ORDER BY table_name")
	iter := sm.client.Single().Query(ctx, stmt)
	defer iter.Stop()

	var tables []string
	for {
		row, err := iter.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}
			return nil, fmt.Errorf("error listing tables: %w", err)
		}

		var tableName string
		if err := row.Columns(&tableName); err != nil {
			log.Printf("Warning: error reading table name: %v", err)
			continue
		}
		tables = append(tables, tableName)
	}

	sort.Strings(tables)
	return tables, nil
}

// GetTableRowCount returns the number of rows in a table
func (sm *SpannerManager) GetTableRowCount(ctx context.Context, tableName string) (int64, error) {
	if tableName == "" {
		return 0, fmt.Errorf("table name cannot be empty")
	}
	
	// Validate table name to prevent SQL injection
	if err := validateTableName(tableName); err != nil {
		return 0, fmt.Errorf("invalid table name: %v", err)
	}
	
	stmt := spanner.NewStatement(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", escapeIdentifier(tableName)))
	iter := sm.client.Single().Query(ctx, stmt)
	defer iter.Stop()

	row, err := iter.Next()
	if err != nil {
		return 0, fmt.Errorf("failed to execute count query for table %s: %w", tableName, err)
	}

	var count int64
	if err := row.Columns(&count); err != nil {
		return 0, fmt.Errorf("failed to read count result for table %s: %w", tableName, err)
	}

	return count, nil
}

// ApplyMutations applies a list of mutations to the database
func (sm *SpannerManager) ApplyMutations(ctx context.Context, mutations []*spanner.Mutation) error {
	if len(mutations) == 0 {
		log.Printf("No mutations to apply")
		return nil
	}

	log.Printf("Applying %d mutations to database...", len(mutations))
	_, err := sm.client.Apply(ctx, mutations)
	if err != nil {
		// Handle already exists error gracefully
		if spanner.ErrCode(err) == codes.AlreadyExists {
			log.Printf("Warning: Some data already exists, continuing...")
			return nil
		}
		return fmt.Errorf("failed to apply mutations: %w", err)
	}

	log.Printf("Successfully applied %d mutations", len(mutations))
	return nil
}

// QueryRows executes a query and returns a row iterator
func (sm *SpannerManager) QueryRows(ctx context.Context, stmt spanner.Statement) (*spanner.RowIterator, error) {
	return sm.client.Single().Query(ctx, stmt), nil
}

// ValidateTableData validates table data against expected values
func (sm *SpannerManager) ValidateTableData(ctx context.Context, tableName string, expectedData interface{}) error {
	// This would implement detailed validation logic
	// For now, return a placeholder implementation
	return fmt.Errorf("ValidateTableData not yet implemented")
}

// GetTableSummary returns a summary of all tables and their row counts
func (sm *SpannerManager) GetTableSummary(ctx context.Context) (DatabaseSummary, error) {
	summary := DatabaseSummary{
		DatabaseID: sm.config.DatabaseID,
		Tables:     []TableSummary{},
		TotalRows:  0,
		Metadata:   make(map[string]interface{}),
	}

	tables, err := sm.ListTables(ctx)
	if err != nil {
		return summary, fmt.Errorf("failed to list tables: %w", err)
	}

	for _, tableName := range tables {
		tableSummary := TableSummary{
			Name:    tableName,
			HasData: false,
		}

		count, err := sm.GetTableRowCount(ctx, tableName)
		if err != nil {
			tableSummary.Error = err.Error()
		} else {
			tableSummary.RowCount = count
			tableSummary.HasData = count > 0
			summary.TotalRows += count
		}

		summary.Tables = append(summary.Tables, tableSummary)
	}

	return summary, nil
}

// ReadSchemaFiles reads schema files from the given path
func (sm *SpannerManager) ReadSchemaFiles(schemaPath string) ([]string, error) {
	return ReadSchemaFiles(schemaPath)
}

// ParseSchemaFromDDL parses schema information from DDL statements
func (sm *SpannerManager) ParseSchemaFromDDL(ddlStatements []string) map[string]map[string]string {
	sm.schemaMap = ParseSchemaFromDDL(ddlStatements)
	sm.mutationBuilder = NewMutationBuilder(sm.schemaMap)
	return sm.schemaMap
}

// BuildInsertMutation builds an insert mutation with proper type conversion
func (sm *SpannerManager) BuildInsertMutation(tableName string, columns []string, values []interface{}) *spanner.Mutation {
	return sm.mutationBuilder.BuildInsertMutation(tableName, columns, values)
}

// ConvertTimeForColumn converts time values for specific columns
func (sm *SpannerManager) ConvertTimeForColumn(value interface{}, tableName, columnName string) interface{} {
	if sm.mutationBuilder == nil {
		return value
	}
	return sm.mutationBuilder.convertValue(tableName, columnName, value)
}

// validateTableName validates that a table name is safe to use in SQL
func validateTableName(tableName string) error {
	if tableName == "" {
		return fmt.Errorf("table name cannot be empty")
	}

	// Check length limits (Spanner identifier limit is 128 characters)
	if len(tableName) > 128 {
		return fmt.Errorf("table name exceeds maximum length of 128 characters")
	}

	// Allow alphanumeric characters, underscores, and hyphens
	// This matches Spanner's identifier naming rules
	validPattern := regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]*$`)
	if !validPattern.MatchString(tableName) {
		return fmt.Errorf("table name contains invalid characters (must start with letter, contain only letters, numbers, underscores, hyphens)")
	}

	return nil
}

// escapeIdentifier escapes an identifier for safe use in SQL
// This function escapes backticks within identifiers
func escapeIdentifier(identifier string) string {
	// Escape any existing backticks by doubling them
	return strings.ReplaceAll(identifier, "`", "``")
}
