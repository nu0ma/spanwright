package db

import (
	"container/list"
	"context"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"sync"

	"cloud.google.com/go/spanner"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"

	"single-database/internal/config"
)

// BoundedSchemaMap implements a memory-bounded schema map with LRU eviction
type BoundedSchemaMap struct {
	maxSize int
	data    map[string]map[string]string
	order   *list.List
	keys    map[string]*list.Element
	mutex   sync.RWMutex
}

// NewBoundedSchemaMap creates a new bounded schema map
func NewBoundedSchemaMap(maxSize int) *BoundedSchemaMap {
	return &BoundedSchemaMap{
		maxSize: maxSize,
		data:    make(map[string]map[string]string),
		order:   list.New(),
		keys:    make(map[string]*list.Element),
	}
}

// Set adds or updates a schema entry
func (bsm *BoundedSchemaMap) Set(key string, value map[string]string) {
	bsm.mutex.Lock()
	defer bsm.mutex.Unlock()
	
	// If key exists, update and move to front
	if elem, exists := bsm.keys[key]; exists {
		bsm.data[key] = value
		bsm.order.MoveToFront(elem)
		return
	}
	
	// If at capacity, remove oldest entry
	if len(bsm.data) >= bsm.maxSize {
		oldest := bsm.order.Back()
		if oldest != nil {
			oldKey := oldest.Value.(string)
			delete(bsm.data, oldKey)
			delete(bsm.keys, oldKey)
			bsm.order.Remove(oldest)
		}
	}
	
	// Add new entry
	bsm.data[key] = value
	elem := bsm.order.PushFront(key)
	bsm.keys[key] = elem
}

// Get retrieves a schema entry
func (bsm *BoundedSchemaMap) Get(key string) (map[string]string, bool) {
	bsm.mutex.RLock()
	defer bsm.mutex.RUnlock()
	
	if value, exists := bsm.data[key]; exists {
		// Move to front on access
		if elem, ok := bsm.keys[key]; ok {
			bsm.order.MoveToFront(elem)
		}
		return value, true
	}
	return nil, false
}

// GetAll returns all current schema entries (for compatibility)
func (bsm *BoundedSchemaMap) GetAll() map[string]map[string]string {
	bsm.mutex.RLock()
	defer bsm.mutex.RUnlock()
	
	result := make(map[string]map[string]string)
	for k, v := range bsm.data {
		result[k] = v
	}
	return result
}

// Size returns the current number of entries
func (bsm *BoundedSchemaMap) Size() int {
	bsm.mutex.RLock()
	defer bsm.mutex.RUnlock()
	return len(bsm.data)
}

// SpannerManager manages Spanner database client
// It implements the DatabaseManager interface
type SpannerManager struct {
	config          *config.DatabaseConfig
	client          *spanner.Client
	schemaMap       *BoundedSchemaMap
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
		schemaMap:       NewBoundedSchemaMap(100), // Limit to 100 schema entries
	}
	sm.mutationBuilder = NewMutationBuilder(sm.schemaMap.GetAll())

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
	schemaData := ParseSchemaFromDDL(ddlStatements)
	
	// Store each table schema in the bounded map
	for tableName, tableSchema := range schemaData {
		sm.schemaMap.Set(tableName, tableSchema)
	}
	
	// Update mutation builder with current schema data
	sm.mutationBuilder = NewMutationBuilder(sm.schemaMap.GetAll())
	return sm.schemaMap.GetAll()
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
