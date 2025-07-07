package spanwright

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/spanner"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"github.com/joho/godotenv"
)

// Config represents the complete application configuration
type Config struct {
	ProjectID       string
	InstanceID      string
	EmulatorHost    string
	PrimaryDB       string
	SecondaryDB     string
	PrimarySchema   string
	SecondarySchema string
	Environment     string
	Timeout         int
}

// DatabaseConfig represents database connection configuration
type DatabaseConfig struct {
	ProjectID  string
	InstanceID string
	DatabaseID string
}

// DatabasePath returns the full database path
func (dc *DatabaseConfig) DatabasePath() string {
	return fmt.Sprintf("projects/%s/instances/%s/databases/%s", dc.ProjectID, dc.InstanceID, dc.DatabaseID)
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	config := &Config{
		ProjectID:       os.Getenv("PROJECT_ID"),
		InstanceID:      os.Getenv("INSTANCE_ID"),
		EmulatorHost:    os.Getenv("SPANNER_EMULATOR_HOST"),
		PrimaryDB:       os.Getenv("PRIMARY_DATABASE_ID"),
		SecondaryDB:     os.Getenv("SECONDARY_DATABASE_ID"),
		PrimarySchema:   os.Getenv("PRIMARY_SCHEMA_PATH"),
		SecondarySchema: os.Getenv("SECONDARY_SCHEMA_PATH"),
		Environment:     getEnvWithDefault("ENVIRONMENT", "development"),
		Timeout:         getEnvIntWithDefault("TIMEOUT_SECONDS", 120),
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return config, nil
}

// Validate performs basic configuration validation
func (c *Config) Validate() error {
	if c.ProjectID == "" {
		return fmt.Errorf("PROJECT_ID is required")
	}
	if c.InstanceID == "" {
		return fmt.Errorf("INSTANCE_ID is required")
	}
	if c.PrimaryDB == "" {
		return fmt.Errorf("PRIMARY_DATABASE_ID is required")
	}
	if c.PrimarySchema == "" {
		return fmt.Errorf("PRIMARY_SCHEMA_PATH is required")
	}
	return nil
}

// GetDatabaseConfig returns a DatabaseConfig for the specified database ID
func (c *Config) GetDatabaseConfig(databaseID string) *DatabaseConfig {
	return &DatabaseConfig{
		ProjectID:  c.ProjectID,
		InstanceID: c.InstanceID,
		DatabaseID: databaseID,
	}
}

// DatabaseManager manages Spanner database operations
type DatabaseManager struct {
	config *DatabaseConfig
	client *spanner.Client
}

// NewDatabaseManager creates a new DatabaseManager
func NewDatabaseManager(ctx context.Context, dbConfig *DatabaseConfig) (*DatabaseManager, error) {
	client, err := spanner.NewClient(ctx, dbConfig.DatabasePath())
	if err != nil {
		return nil, fmt.Errorf("failed to create Spanner client: %w", err)
	}

	return &DatabaseManager{
		config: dbConfig,
		client: client,
	}, nil
}

// Close closes the Spanner client
func (dm *DatabaseManager) Close() error {
	if dm.client != nil {
		dm.client.Close()
	}
	return nil
}

// ListTables returns all table names in the database
func (dm *DatabaseManager) ListTables(ctx context.Context) ([]string, error) {
	stmt := spanner.NewStatement("SELECT table_name FROM information_schema.tables WHERE table_schema = '' ORDER BY table_name")
	iter := dm.client.Single().Query(ctx, stmt)
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
func (dm *DatabaseManager) GetTableRowCount(ctx context.Context, tableName string) (int64, error) {
	if tableName == "" {
		return 0, fmt.Errorf("table name cannot be empty")
	}

	if err := validateTableName(tableName); err != nil {
		return 0, fmt.Errorf("invalid table name: %w", err)
	}

	stmt := spanner.NewStatement(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", escapeIdentifier(tableName)))
	iter := dm.client.Single().Query(ctx, stmt)
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

// ApplyMutations applies mutations to the database with retry logic
func (dm *DatabaseManager) ApplyMutations(ctx context.Context, mutations []*spanner.Mutation) error {
	if len(mutations) == 0 {
		return nil
	}

	return WithRetry(ctx, "Apply Mutations", func(ctx context.Context, attempt int) error {
		_, err := dm.client.Apply(ctx, mutations)
		if err != nil {
			if spanner.ErrCode(err) == codes.AlreadyExists {
				log.Printf("Warning: Some data already exists, continuing...")
				return nil
			}
			return err
		}
		return nil
	})
}

// Query executes a query with retry logic
func (dm *DatabaseManager) Query(ctx context.Context, stmt spanner.Statement) (*spanner.RowIterator, error) {
	var iter *spanner.RowIterator
	err := WithRetry(ctx, "Query", func(ctx context.Context, attempt int) error {
		iter = dm.client.Single().Query(ctx, stmt)
		return nil
	})
	return iter, err
}

// WithRetry executes a function with simple retry logic
func WithRetry(ctx context.Context, operation string, fn func(context.Context, int) error) error {
	maxAttempts := 3
	initialDelay := 100 * time.Millisecond

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		err := fn(ctx, attempt)
		if err == nil {
			return nil
		}

		lastErr = err

		if !isRetryableError(err) {
			return err
		}

		if attempt == maxAttempts {
			break
		}

		delay := time.Duration(attempt) * initialDelay
		log.Printf("⚠️ %s failed on attempt %d/%d, retrying in %v: %v", operation, attempt, maxAttempts, delay, err)

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}

	return fmt.Errorf("max retry attempts (%d) exceeded: %w", maxAttempts, lastErr)
}

// isRetryableError determines if an error should be retried
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	if err == context.Canceled || err == context.DeadlineExceeded {
		return false
	}

	spannerCode := spanner.ErrCode(err)
	switch spannerCode {
	case codes.Unavailable, codes.DeadlineExceeded, codes.ResourceExhausted, codes.Internal:
		return true
	default:
		return false
	}
}

// validateTableName validates that a table name is safe
func validateTableName(tableName string) error {
	if tableName == "" {
		return fmt.Errorf("table name cannot be empty")
	}

	if len(tableName) > 128 {
		return fmt.Errorf("table name exceeds maximum length of 128 characters")
	}

	validPattern := regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]*$`)
	if !validPattern.MatchString(tableName) {
		return fmt.Errorf("table name contains invalid characters")
	}

	return nil
}

// escapeIdentifier escapes an identifier for safe use in SQL
func escapeIdentifier(identifier string) string {
	return strings.ReplaceAll(identifier, "`", "``")
}

// ReadSchemaFiles reads SQL schema files from a directory
func ReadSchemaFiles(schemaPath string) ([]string, error) {
	if schemaPath == "" {
		return nil, fmt.Errorf("schema path cannot be empty")
	}

	absPath, err := filepath.Abs(schemaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve absolute path: %w", err)
	}

	files, err := filepath.Glob(filepath.Join(absPath, "*.sql"))
	if err != nil {
		return nil, fmt.Errorf("failed to list schema files: %w", err)
	}

	var ddlStatements []string
	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("failed to read schema file %s: %w", file, err)
		}
		ddlStatements = append(ddlStatements, string(content))
	}

	return ddlStatements, nil
}

// Helper functions
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvIntWithDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}