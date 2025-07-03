package db

import (
	"context"

	"cloud.google.com/go/spanner"
)

// DatabaseClient defines the interface for database operations
type DatabaseClient interface {
	// Connection management
	Close() error

	// Schema operations
	ListTables(ctx context.Context) ([]string, error)
	GetTableRowCount(ctx context.Context, tableName string) (int64, error)

	// Data operations
	ApplyMutations(ctx context.Context, mutations []*spanner.Mutation) error
	QueryRows(ctx context.Context, stmt spanner.Statement) (*spanner.RowIterator, error)

	// Validation operations
	ValidateTableData(ctx context.Context, tableName string, expectedData interface{}) error
}

// SchemaReader defines the interface for reading schema information
type SchemaReader interface {
	ReadSchemaFiles(schemaPath string) ([]string, error)
	ParseSchemaFromDDL(ddlStatements []string) map[string]map[string]string
}

// MutationGenerator defines the interface for generating mutations
type MutationGenerator interface {
	BuildInsertMutation(tableName string, columns []string, values []interface{}) *spanner.Mutation
	ConvertTimeForColumn(value interface{}, tableName, columnName string) interface{}
}

// DatabaseManager defines the interface for high-level database management
type DatabaseManager interface {
	DatabaseClient
	SchemaReader
	MutationGenerator

	// High-level operations
	GetTableSummary(ctx context.Context) (DatabaseSummary, error)
}

// DatabaseSummary represents a summary of database tables and their data
type DatabaseSummary struct {
	DatabaseID string                 `json:"database_id"`
	Tables     []TableSummary         `json:"tables"`
	TotalRows  int64                  `json:"total_rows"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// TableSummary represents a summary of a single table
type TableSummary struct {
	Name     string `json:"name"`
	RowCount int64  `json:"row_count"`
	HasData  bool   `json:"has_data"`
	Error    string `json:"error,omitempty"`
}