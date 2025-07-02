package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// Config represents the complete application configuration
type Config struct {
	Spanner   SpannerConfig   `json:"spanner"`
	Databases DatabasesConfig `json:"databases"`
	Paths     PathsConfig     `json:"paths"`
	Runtime   RuntimeConfig   `json:"runtime"`
}

// SpannerConfig holds Spanner connection configuration
type SpannerConfig struct {
	ProjectID     string `json:"project_id"`
	InstanceID    string `json:"instance_id"`
	EmulatorHost  string `json:"emulator_host"`
}

// DatabasesConfig holds database-specific configuration
type DatabasesConfig struct {
	PrimaryDB     string `json:"primary_db"`
	SecondaryDB   string `json:"secondary_db"`
	DefaultDB     string `json:"default_db"`
}

// PathsConfig holds file and directory paths
type PathsConfig struct {
	PrimarySchema     string `json:"primary_schema"`
	SecondarySchema   string `json:"secondary_schema"`
	DefaultSchema     string `json:"default_schema"`
	DefaultSeedFile   string `json:"default_seed_file"`
}

// RuntimeConfig holds runtime-specific configuration
type RuntimeConfig struct {
	Environment string `json:"environment"`
	LogLevel    string `json:"log_level"`
	Timeout     int    `json:"timeout_seconds"`
}

// LoadConfig loads configuration from environment variables with validation
func LoadConfig() (*Config, error) {
	// Load .env file (ignore error if file doesn't exist)
	_ = godotenv.Load()

	config := &Config{
		Spanner: SpannerConfig{
			ProjectID:    os.Getenv("PROJECT_ID"),
			InstanceID:   os.Getenv("INSTANCE_ID"),
			EmulatorHost: os.Getenv("SPANNER_EMULATOR_HOST"),
		},
		Databases: DatabasesConfig{
			PrimaryDB:     os.Getenv("PRIMARY_DATABASE_ID"),
			SecondaryDB:   os.Getenv("SECONDARY_DATABASE_ID"),
			DefaultDB:     os.Getenv("DATABASE_ID"),
		},
		Paths: PathsConfig{
			PrimarySchema:     os.Getenv("PRIMARY_SCHEMA_PATH"),
			SecondarySchema:   os.Getenv("SECONDARY_SCHEMA_PATH"),
			DefaultSchema:     os.Getenv("SCHEMA_PATH"),
			DefaultSeedFile:   os.Getenv("SEED_FILE"),
		},
		Runtime: RuntimeConfig{
			Environment: getEnvWithDefault("ENVIRONMENT", "development"),
			LogLevel:    getEnvWithDefault("LOG_LEVEL", "info"),
			Timeout:     getEnvIntWithDefault("TIMEOUT_SECONDS", 120),
		},
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return config, nil
}

// Validate performs comprehensive validation of the configuration
func (c *Config) Validate() error {
	var errors ValidationErrors

	// Validate Spanner configuration
	if err := ValidateProjectID(c.Spanner.ProjectID); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateInstanceID(c.Spanner.InstanceID); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateSpannerEmulatorHost(c.Spanner.EmulatorHost); err != nil {
		errors = append(errors, err.(ValidationError))
	}

	// Validate database IDs
	if err := ValidateDatabaseID(c.Databases.PrimaryDB); err != nil {
		errors = append(errors, ValidationError{
			Field:   "PRIMARY_DATABASE_ID",
			Value:   c.Databases.PrimaryDB,
			Message: err.(ValidationError).Message,
			Suggestion: err.(ValidationError).Suggestion,
		})
	}
	if err := ValidateDatabaseID(c.Databases.SecondaryDB); err != nil {
		errors = append(errors, ValidationError{
			Field:   "SECONDARY_DATABASE_ID",
			Value:   c.Databases.SecondaryDB,
			Message: err.(ValidationError).Message,
			Suggestion: err.(ValidationError).Suggestion,
		})
	}

	// Validate schema paths
	if err := ValidateSchemaPath(c.Paths.PrimarySchema, "PRIMARY_SCHEMA_PATH"); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateSchemaPath(c.Paths.SecondarySchema, "SECONDARY_SCHEMA_PATH"); err != nil {
		errors = append(errors, err.(ValidationError))
	}

	// Validate optional paths
	if err := ValidateOptionalPath(c.Paths.DefaultSchema, "SCHEMA_PATH"); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateOptionalPath(c.Paths.DefaultSeedFile, "SEED_FILE"); err != nil {
		errors = append(errors, err.(ValidationError))
	}

	if errors.HasErrors() {
		return errors
	}

	return nil
}

// GetDatabaseConfig returns a DatabaseConfig for the specified database ID
func (c *Config) GetDatabaseConfig(databaseID string) *DatabaseConfig {
	return &DatabaseConfig{
		ProjectID:  c.Spanner.ProjectID,
		InstanceID: c.Spanner.InstanceID,
		DatabaseID: databaseID,
	}
}

// GetPrimaryDatabaseConfig returns DatabaseConfig for Primary DB
func (c *Config) GetPrimaryDatabaseConfig() *DatabaseConfig {
	return c.GetDatabaseConfig(c.Databases.PrimaryDB)
}

// GetSecondaryDatabaseConfig returns DatabaseConfig for Secondary DB
func (c *Config) GetSecondaryDatabaseConfig() *DatabaseConfig {
	return c.GetDatabaseConfig(c.Databases.SecondaryDB)
}

// GetAbsoluteSchemaPath returns the absolute path for a schema directory
func (c *Config) GetAbsoluteSchemaPath(schemaPath string) (string, error) {
	if schemaPath == "" {
		return "", fmt.Errorf("schema path cannot be empty")
	}
	return filepath.Abs(schemaPath)
}

// IsDevelopment returns true if running in development environment
func (c *Config) IsDevelopment() bool {
	return c.Runtime.Environment == "development"
}

// IsProduction returns true if running in production environment
func (c *Config) IsProduction() bool {
	return c.Runtime.Environment == "production"
}

// GetLogLevel returns the configured log level
func (c *Config) GetLogLevel() string {
	return c.Runtime.LogLevel
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
		} else {
			log.Printf("Warning: Invalid integer value for %s=%q, using default %d. Error: %v", 
				key, value, defaultValue, err)
		}
	}
	return defaultValue
}