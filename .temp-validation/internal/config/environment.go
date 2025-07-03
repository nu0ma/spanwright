package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// CommonFlags represents common command-line flags used across commands
type CommonFlags struct {
	SchemaPath string
	DatabaseID string
	SeedFile   string
}

// ParseFlags parses common command-line flags with environment variable fallback
func ParseFlags() *CommonFlags {
	flags := &CommonFlags{}

	flag.StringVar(&flags.SchemaPath, "schema", "schema", "Path to the schema directory or DDL file")
	flag.StringVar(&flags.DatabaseID, "database-id", "test-db", "Database ID")
	flag.StringVar(&flags.SeedFile, "seed-file", "", "Path to the seed file in seed directory")
	flag.Parse()

	// Override with environment variables if available
	if envSchemaPath := os.Getenv("SCHEMA_PATH"); envSchemaPath != "" {
		flags.SchemaPath = envSchemaPath
	}
	if envDatabaseID := os.Getenv("DATABASE_ID"); envDatabaseID != "" {
		flags.DatabaseID = envDatabaseID
	}
	if envSeedFile := os.Getenv("SEED_FILE"); envSeedFile != "" {
		flags.SeedFile = envSeedFile
	}

	return flags
}

// LoadEnvFile loads .env file and validates required environment variables
// Deprecated: Use LoadConfig() instead for better validation and type safety
func LoadEnvFile() error {
	// Try to load using the new configuration system first
	if _, err := LoadConfig(); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}
	return nil
}

// LoadEnvFileBasic provides basic environment loading without comprehensive validation
// This is used for backward compatibility
func LoadEnvFileBasic() error {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("failed to load .env file: %v", err)
	}

	// Validate required environment variables
	requiredVars := []string{
		"PROJECT_ID",
		"INSTANCE_ID",
		"SPANNER_EMULATOR_HOST",
		"PRIMARY_DATABASE_ID",
		"SECONDARY_DATABASE_ID",
		"PRIMARY_SCHEMA_PATH",
		"SECONDARY_SCHEMA_PATH",
	}

	var missingVars []string
	for _, envVar := range requiredVars {
		if value := os.Getenv(envVar); value == "" {
			missingVars = append(missingVars, envVar)
		}
	}

	if len(missingVars) > 0 {
		return fmt.Errorf("missing required environment variables: %v", missingVars)
	}

	return nil
}

// GetRequiredEnv returns environment variable value or error if not set
func GetRequiredEnv(key string) (string, error) {
	value := os.Getenv(key)
	if value == "" {
		return "", fmt.Errorf("required environment variable %s is not set", key)
	}
	return value, nil
}

// GetRequiredEnvWithValidation returns environment variable with validation
func GetRequiredEnvWithValidation(key string) (string, error) {
	value, err := GetRequiredEnv(key)
	if err != nil {
		return "", err
	}

	// Apply validation based on the key
	switch key {
	case "PROJECT_ID":
		if err := ValidateProjectID(value); err != nil {
			return "", err
		}
	case "INSTANCE_ID":
		if err := ValidateInstanceID(value); err != nil {
			return "", err
		}
	case "SPANNER_EMULATOR_HOST":
		if err := ValidateSpannerEmulatorHost(value); err != nil {
			return "", err
		}
	case "PRIMARY_DATABASE_ID", "SECONDARY_DATABASE_ID":
		if err := ValidateDatabaseID(value); err != nil {
			return "", err
		}
	case "PRIMARY_SCHEMA_PATH":
		if err := ValidateSchemaPath(value, key); err != nil {
			return "", err
		}
	case "SECONDARY_SCHEMA_PATH":
		if err := ValidateSchemaPath(value, key); err != nil {
			return "", err
		}
	}

	return value, nil
}

// GetEnvWithDefault returns environment variable value or default if not set
// NOTE: This function is deprecated. Use GetRequiredEnv for required variables.
func GetEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// SetSpannerEmulatorHost sets the SPANNER_EMULATOR_HOST environment variable
func SetSpannerEmulatorHost(host string) {
	os.Setenv("SPANNER_EMULATOR_HOST", host)
}
