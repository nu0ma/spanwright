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

// Security validation patterns for Google Cloud Spanner resource IDs
var (
	// Project ID: 6-30 characters, lowercase letters, digits, hyphens
	// Must start with lowercase letter, cannot end with hyphen
	projectIDRegex = regexp.MustCompile(`^[a-z][a-z0-9-]{4,28}[a-z0-9]$`)
	
	// Instance ID: 2-64 characters, lowercase letters, digits, hyphens
	// Must start with lowercase letter
	instanceIDRegex = regexp.MustCompile(`^[a-z][a-z0-9-]{1,63}$`)
	
	// Database ID: 2-30 characters, lowercase letters, digits, hyphens, underscores
	// Must start with lowercase letter
	databaseIDRegex = regexp.MustCompile(`^[a-z][a-z0-9-_]{1,29}$`)
	
	// Table name: 1-128 characters, letters, digits, underscores, hyphens
	// Must start with letter
	tableNameRegex = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]*$`)
)

// ValidateSpannerIDs validates Google Cloud Spanner resource identifiers
// to prevent injection attacks and ensure they follow GCP naming conventions
func ValidateSpannerIDs(projectID, instanceID, databaseID string) error {
	if err := ValidateProjectID(projectID); err != nil {
		return fmt.Errorf("invalid project ID: %w", err)
	}
	
	if err := ValidateInstanceID(instanceID); err != nil {
		return fmt.Errorf("invalid instance ID: %w", err)
	}
	
	if err := ValidateDatabaseID(databaseID); err != nil {
		return fmt.Errorf("invalid database ID: %w", err)
	}
	
	return nil
}

// ValidateProjectID validates a Google Cloud Project ID
func ValidateProjectID(projectID string) error {
	if projectID == "" {
		return fmt.Errorf("project ID cannot be empty")
	}
	
	if len(projectID) < 6 || len(projectID) > 30 {
		return fmt.Errorf("project ID must be 6-30 characters long")
	}
	
	if !projectIDRegex.MatchString(projectID) {
		return fmt.Errorf("project ID must start with lowercase letter, contain only lowercase letters, digits, and hyphens, and not end with hyphen")
	}
	
	// Additional security check for path traversal
	if strings.Contains(projectID, "..") || strings.Contains(projectID, "/") || strings.Contains(projectID, "\\") {
		return fmt.Errorf("project ID contains invalid path characters")
	}
	
	return nil
}

// ValidateInstanceID validates a Google Cloud Spanner Instance ID
func ValidateInstanceID(instanceID string) error {
	if instanceID == "" {
		return fmt.Errorf("instance ID cannot be empty")
	}
	
	if len(instanceID) < 2 || len(instanceID) > 64 {
		return fmt.Errorf("instance ID must be 2-64 characters long")
	}
	
	if !instanceIDRegex.MatchString(instanceID) {
		return fmt.Errorf("instance ID must start with lowercase letter and contain only lowercase letters, digits, and hyphens")
	}
	
	// Additional security check for path traversal
	if strings.Contains(instanceID, "..") || strings.Contains(instanceID, "/") || strings.Contains(instanceID, "\\") {
		return fmt.Errorf("instance ID contains invalid path characters")
	}
	
	return nil
}

// ValidateDatabaseID validates a Google Cloud Spanner Database ID
func ValidateDatabaseID(databaseID string) error {
	if databaseID == "" {
		return fmt.Errorf("database ID cannot be empty")
	}
	
	if len(databaseID) < 2 || len(databaseID) > 30 {
		return fmt.Errorf("database ID must be 2-30 characters long")
	}
	
	if !databaseIDRegex.MatchString(databaseID) {
		return fmt.Errorf("database ID must start with lowercase letter and contain only lowercase letters, digits, hyphens, and underscores")
	}
	
	// Additional security check for path traversal
	if strings.Contains(databaseID, "..") || strings.Contains(databaseID, "/") || strings.Contains(databaseID, "\\") {
		return fmt.Errorf("database ID contains invalid path characters")
	}
	
	return nil
}

// BuildSecureDSN constructs a secure Database Service Name (DSN) for Spanner
// with full validation to prevent injection attacks
func BuildSecureDSN(projectID, instanceID, databaseID string) (string, error) {
	// Validate all inputs first
	if err := ValidateSpannerIDs(projectID, instanceID, databaseID); err != nil {
		return "", fmt.Errorf("DSN validation failed: %w", err)
	}
	
	// Use string concatenation instead of fmt.Sprintf to avoid formatting issues
	dsn := "projects/" + projectID + "/instances/" + instanceID + "/databases/" + databaseID
	
	// Additional validation of final DSN
	if strings.Contains(dsn, "..") {
		return "", fmt.Errorf("DSN contains path traversal sequences")
	}
	
	// Check for suspicious patterns in the final DSN
	if strings.Contains(dsn, ";") || strings.Contains(dsn, "&") || strings.Contains(dsn, "|") {
		return "", fmt.Errorf("DSN contains suspicious characters")
	}
	
	return dsn, nil
}

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

// SecureConfig represents a configuration with enhanced security validation
type SecureConfig struct {
	ProjectID       string `json:"project_id" validate:"required,spanner-project-id"`
	InstanceID      string `json:"instance_id" validate:"required,spanner-instance-id"`
	EmulatorHost    string `json:"emulator_host" validate:"required,emulator-host"`
	PrimaryDB       string `json:"primary_db" validate:"required,spanner-database-id"`
	SecondaryDB     string `json:"secondary_db,omitempty" validate:"omitempty,spanner-database-id"`
	PrimarySchema   string `json:"primary_schema" validate:"required,schema-path"`
	SecondarySchema string `json:"secondary_schema,omitempty" validate:"omitempty,schema-path"`
	Environment     string `json:"environment" validate:"required,oneof=development test staging"`
	Timeout         int    `json:"timeout" validate:"required,min=1,max=3600"`
}

// DatabaseConfig represents database connection configuration
type DatabaseConfig struct {
	ProjectID  string
	InstanceID string
	DatabaseID string
}

// DatabasePath returns the full database path with security validation
func (dc *DatabaseConfig) DatabasePath() string {
	dsn, err := BuildSecureDSN(dc.ProjectID, dc.InstanceID, dc.DatabaseID)
	if err != nil {
		log.Printf("ERROR: DatabasePath validation failed: %v", err)
		// Return empty string to prevent using invalid DSN
		return ""
	}
	return dsn
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

// LoadSecureConfig loads configuration with enhanced security validation
func LoadSecureConfig() (*SecureConfig, error) {
	_ = godotenv.Load()

	config := &SecureConfig{
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

	if err := config.ValidateSecure(); err != nil {
		return nil, fmt.Errorf("secure configuration validation failed: %w", err)
	}

	return config, nil
}

// ToConfig converts SecureConfig to regular Config
func (sc *SecureConfig) ToConfig() *Config {
	return &Config{
		ProjectID:       sc.ProjectID,
		InstanceID:      sc.InstanceID,
		EmulatorHost:    sc.EmulatorHost,
		PrimaryDB:       sc.PrimaryDB,
		SecondaryDB:     sc.SecondaryDB,
		PrimarySchema:   sc.PrimarySchema,
		SecondarySchema: sc.SecondarySchema,
		Environment:     sc.Environment,
		Timeout:         sc.Timeout,
	}
}

// ValidateSecure performs comprehensive security validation on SecureConfig
func (sc *SecureConfig) ValidateSecure() error {
	// Validate required fields
	if sc.ProjectID == "" {
		return fmt.Errorf("PROJECT_ID is required")
	}
	if sc.InstanceID == "" {
		return fmt.Errorf("INSTANCE_ID is required")
	}
	if sc.PrimaryDB == "" {
		return fmt.Errorf("PRIMARY_DATABASE_ID is required")
	}
	if sc.PrimarySchema == "" {
		return fmt.Errorf("PRIMARY_SCHEMA_PATH is required")
	}
	if sc.Environment == "" {
		return fmt.Errorf("ENVIRONMENT is required")
	}
	
	// Security validation for Spanner IDs
	if err := ValidateProjectID(sc.ProjectID); err != nil {
		return fmt.Errorf("PROJECT_ID validation failed: %w", err)
	}
	
	if err := ValidateInstanceID(sc.InstanceID); err != nil {
		return fmt.Errorf("INSTANCE_ID validation failed: %w", err)
	}
	
	if err := ValidateDatabaseID(sc.PrimaryDB); err != nil {
		return fmt.Errorf("PRIMARY_DATABASE_ID validation failed: %w", err)
	}
	
	// Validate secondary database if provided
	if sc.SecondaryDB != "" {
		if err := ValidateDatabaseID(sc.SecondaryDB); err != nil {
			return fmt.Errorf("SECONDARY_DATABASE_ID validation failed: %w", err)
		}
	}
	
	// Validate schema paths for security
	if err := validateSchemaPath(sc.PrimarySchema); err != nil {
		return fmt.Errorf("PRIMARY_SCHEMA_PATH validation failed: %w", err)
	}
	
	if sc.SecondarySchema != "" {
		if err := validateSchemaPath(sc.SecondarySchema); err != nil {
			return fmt.Errorf("SECONDARY_SCHEMA_PATH validation failed: %w", err)
		}
	}
	
	// Validate environment
	if err := validateEnvironment(sc.Environment); err != nil {
		return fmt.Errorf("ENVIRONMENT validation failed: %w", err)
	}
	
	// Validate timeout
	if sc.Timeout < 1 || sc.Timeout > 3600 {
		return fmt.Errorf("TIMEOUT must be between 1 and 3600 seconds")
	}
	
	// EMULATOR ONLY: Enforce emulator connection for safety
	if sc.EmulatorHost == "" {
		return fmt.Errorf("SPANNER_EMULATOR_HOST is required - this tool only works with emulator to prevent accidental production access")
	}
	
	// Validate emulator host format
	if err := validateEmulatorHost(sc.EmulatorHost); err != nil {
		return fmt.Errorf("SPANNER_EMULATOR_HOST validation failed: %w", err)
	}
	
	// Prevent production-like configurations
	if err := sc.validateAgainstProductionPatterns(); err != nil {
		return err
	}
	
	return nil
}

// Validate performs comprehensive configuration validation with security checks
func (c *Config) Validate() error {
	// Validate required fields
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
	
	// Security validation for Spanner IDs
	if err := ValidateProjectID(c.ProjectID); err != nil {
		return fmt.Errorf("PROJECT_ID validation failed: %w", err)
	}
	
	if err := ValidateInstanceID(c.InstanceID); err != nil {
		return fmt.Errorf("INSTANCE_ID validation failed: %w", err)
	}
	
	if err := ValidateDatabaseID(c.PrimaryDB); err != nil {
		return fmt.Errorf("PRIMARY_DATABASE_ID validation failed: %w", err)
	}
	
	// Validate secondary database if provided
	if c.SecondaryDB != "" {
		if err := ValidateDatabaseID(c.SecondaryDB); err != nil {
			return fmt.Errorf("SECONDARY_DATABASE_ID validation failed: %w", err)
		}
	}
	
	// Validate schema paths for security
	if err := validateSchemaPath(c.PrimarySchema); err != nil {
		return fmt.Errorf("PRIMARY_SCHEMA_PATH validation failed: %w", err)
	}
	
	if c.SecondarySchema != "" {
		if err := validateSchemaPath(c.SecondarySchema); err != nil {
			return fmt.Errorf("SECONDARY_SCHEMA_PATH validation failed: %w", err)
		}
	}
	
	// EMULATOR ONLY: Enforce emulator connection for safety
	if c.EmulatorHost == "" {
		return fmt.Errorf("SPANNER_EMULATOR_HOST is required - this tool only works with emulator to prevent accidental production access")
	}
	
	// Validate emulator host format
	if !strings.Contains(c.EmulatorHost, "localhost") && !strings.Contains(c.EmulatorHost, "127.0.0.1") {
		return fmt.Errorf("SPANNER_EMULATOR_HOST must use localhost or 127.0.0.1 - production hosts are not allowed")
	}
	
	// Prevent production-like configurations
	if err := c.validateAgainstProductionPatterns(); err != nil {
		return err
	}
	
	return nil
}

// validateEnvironment validates the environment setting
func validateEnvironment(environment string) error {
	validEnvironments := []string{"development", "test", "staging"}
	environment = strings.ToLower(environment)
	
	for _, validEnv := range validEnvironments {
		if environment == validEnv {
			return nil
		}
	}
	
	return fmt.Errorf("environment must be one of: %s", strings.Join(validEnvironments, ", "))
}

// validateEmulatorHost validates the emulator host setting
func validateEmulatorHost(emulatorHost string) error {
	if emulatorHost == "" {
		return fmt.Errorf("emulator host cannot be empty")
	}
	
	// Must contain localhost or 127.0.0.1
	if !strings.Contains(emulatorHost, "localhost") && !strings.Contains(emulatorHost, "127.0.0.1") {
		return fmt.Errorf("emulator host must use localhost or 127.0.0.1 - production hosts are not allowed")
	}
	
	// Check for suspicious patterns
	if strings.Contains(emulatorHost, "..") || strings.Contains(emulatorHost, ";") || strings.Contains(emulatorHost, "&") {
		return fmt.Errorf("emulator host contains suspicious characters")
	}
	
	return nil
}

// validateAgainstProductionPatterns checks for production-like configuration patterns for SecureConfig
func (sc *SecureConfig) validateAgainstProductionPatterns() error {
	// Common production project ID patterns to reject
	productionPatterns := []string{
		"prod", "production", "live", "main", "master",
		"real", "actual", "staging", "stage",
	}
	
	projectLower := strings.ToLower(sc.ProjectID)
	instanceLower := strings.ToLower(sc.InstanceID)
	
	for _, pattern := range productionPatterns {
		if strings.Contains(projectLower, pattern) {
			return fmt.Errorf("PROJECT_ID '%s' appears to be production-like (contains '%s') - only test/dev configurations allowed", sc.ProjectID, pattern)
		}
		if strings.Contains(instanceLower, pattern) {
			return fmt.Errorf("INSTANCE_ID '%s' appears to be production-like (contains '%s') - only test/dev configurations allowed", sc.InstanceID, pattern)
		}
	}
	
	// Reject if it looks like a real GCP project ID format
	if matched, _ := regexp.MatchString(`^[a-z][a-z0-9-]{4,28}[a-z0-9]$`, sc.ProjectID); matched && !strings.Contains(projectLower, "test") && !strings.Contains(projectLower, "dev") && !strings.Contains(projectLower, "local") {
		return fmt.Errorf("PROJECT_ID '%s' looks like a real GCP project - only test/dev/local projects allowed", sc.ProjectID)
	}
	
	return nil
}

// validateAgainstProductionPatterns checks for production-like configuration patterns
func (c *Config) validateAgainstProductionPatterns() error {
	// Common production project ID patterns to reject
	productionPatterns := []string{
		"prod", "production", "live", "main", "master",
		"real", "actual", "staging", "stage",
	}
	
	projectLower := strings.ToLower(c.ProjectID)
	instanceLower := strings.ToLower(c.InstanceID)
	
	for _, pattern := range productionPatterns {
		if strings.Contains(projectLower, pattern) {
			return fmt.Errorf("PROJECT_ID '%s' appears to be production-like (contains '%s') - only test/dev configurations allowed", c.ProjectID, pattern)
		}
		if strings.Contains(instanceLower, pattern) {
			return fmt.Errorf("INSTANCE_ID '%s' appears to be production-like (contains '%s') - only test/dev configurations allowed", c.InstanceID, pattern)
		}
	}
	
	// Reject if it looks like a real GCP project ID format
	if matched, _ := regexp.MatchString(`^[a-z][a-z0-9-]{4,28}[a-z0-9]$`, c.ProjectID); matched && !strings.Contains(projectLower, "test") && !strings.Contains(projectLower, "dev") && !strings.Contains(projectLower, "local") {
		return fmt.Errorf("PROJECT_ID '%s' looks like a real GCP project - only test/dev/local projects allowed", c.ProjectID)
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

	if err := ValidateTableName(tableName); err != nil {
		return 0, fmt.Errorf("invalid table name: %w", err)
	}

	// Use parameterized query to prevent SQL injection
	// Note: Spanner doesn't support parameterized table names, so we use validation + escaping
	escapedTableName := escapeIdentifier(tableName)
	stmt := spanner.NewStatement(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", escapedTableName))
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

// ValidateTableName validates that a table name is safe using enhanced security checks
func ValidateTableName(tableName string) error {
	if tableName == "" {
		return fmt.Errorf("table name cannot be empty")
	}

	if len(tableName) > 128 {
		return fmt.Errorf("table name exceeds maximum length of 128 characters")
	}

	if !tableNameRegex.MatchString(tableName) {
		return fmt.Errorf("table name must start with letter and contain only letters, digits, underscores, and hyphens")
	}

	// Additional security checks for injection prevention
	if strings.Contains(tableName, "..") || strings.Contains(tableName, "/") || strings.Contains(tableName, "\\") {
		return fmt.Errorf("table name contains invalid path characters")
	}

	// Check for SQL injection attempts
	lowerName := strings.ToLower(tableName)
	dangerousPatterns := []string{"select", "insert", "update", "delete", "drop", "create", "alter", "exec", "union", "script", "javascript"}
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowerName, pattern) {
			return fmt.Errorf("table name contains potentially dangerous SQL keywords")
		}
	}

	return nil
}

// validateSchemaPath validates that a schema file path is safe
func validateSchemaPath(schemaPath string) error {
	if schemaPath == "" {
		return fmt.Errorf("schema path cannot be empty")
	}

	// Check for path traversal attempts
	cleanPath := filepath.Clean(schemaPath)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("path traversal not allowed in schema path")
	}

	// Ensure path is not absolute or contains suspicious patterns
	if filepath.IsAbs(cleanPath) {
		return fmt.Errorf("absolute paths not allowed for schema files")
	}

	// Check for suspicious characters that could be used in injection
	if strings.Contains(cleanPath, ";") || strings.Contains(cleanPath, "&") || strings.Contains(cleanPath, "|") {
		return fmt.Errorf("schema path contains suspicious characters")
	}

	// Validate that path exists and is readable
	if _, err := os.Stat(cleanPath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("schema path does not exist: %s", cleanPath)
		}
		return fmt.Errorf("cannot access schema path: %v", err)
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