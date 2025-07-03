package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetEnvIntWithDefault(t *testing.T) {
	tests := []struct {
		name         string
		envKey       string
		envValue     string
		defaultValue int
		expected     int
		shouldLog    bool
	}{
		{
			name:         "valid integer",
			envKey:       "TEST_INT_VALID",
			envValue:     "42",
			defaultValue: 10,
			expected:     42,
			shouldLog:    false,
		},
		{
			name:         "empty environment variable",
			envKey:       "TEST_INT_EMPTY",
			envValue:     "",
			defaultValue: 100,
			expected:     100,
			shouldLog:    false,
		},
		{
			name:         "invalid integer - letters",
			envKey:       "TEST_INT_INVALID_LETTERS",
			envValue:     "abc",
			defaultValue: 50,
			expected:     50,
			shouldLog:    true,
		},
		{
			name:         "invalid integer - mixed",
			envKey:       "TEST_INT_INVALID_MIXED",
			envValue:     "123abc",
			defaultValue: 25,
			expected:     25,
			shouldLog:    true,
		},
		{
			name:         "negative integer",
			envKey:       "TEST_INT_NEGATIVE",
			envValue:     "-5",
			defaultValue: 0,
			expected:     -5,
			shouldLog:    false,
		},
		{
			name:         "zero",
			envKey:       "TEST_INT_ZERO",
			envValue:     "0",
			defaultValue: 10,
			expected:     0,
			shouldLog:    false,
		},
		{
			name:         "large integer",
			envKey:       "TEST_INT_LARGE",
			envValue:     "999999",
			defaultValue: 1,
			expected:     999999,
			shouldLog:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean up environment
			defer os.Unsetenv(tt.envKey)

			// Set environment variable if provided
			if tt.envValue != "" {
				os.Setenv(tt.envKey, tt.envValue)
			}

			// Test the function
			result := getEnvIntWithDefault(tt.envKey, tt.defaultValue)
			assert.Equal(t, tt.expected, result, "getEnvIntWithDefault should return expected value")
		})
	}
}

func TestGetEnvWithDefault(t *testing.T) {
	tests := []struct {
		name         string
		envKey       string
		envValue     string
		defaultValue string
		expected     string
	}{
		{
			name:         "environment variable set",
			envKey:       "TEST_STRING_SET",
			envValue:     "test_value",
			defaultValue: "default",
			expected:     "test_value",
		},
		{
			name:         "environment variable empty",
			envKey:       "TEST_STRING_EMPTY",
			envValue:     "",
			defaultValue: "default",
			expected:     "default",
		},
		{
			name:         "environment variable not set",
			envKey:       "TEST_STRING_NOT_SET",
			envValue:     "",
			defaultValue: "default",
			expected:     "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean up environment
			defer os.Unsetenv(tt.envKey)

			// Set environment variable if provided
			if tt.envValue != "" {
				os.Setenv(tt.envKey, tt.envValue)
			}

			result := getEnvWithDefault(tt.envKey, tt.defaultValue)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLoadConfig(t *testing.T) {
	// Save original environment
	originalEnv := map[string]string{
		"PROJECT_ID":                os.Getenv("PROJECT_ID"),
		"INSTANCE_ID":               os.Getenv("INSTANCE_ID"),
		"SPANNER_EMULATOR_HOST":     os.Getenv("SPANNER_EMULATOR_HOST"),
		"PRIMARY_DATABASE_ID":       os.Getenv("PRIMARY_DATABASE_ID"),
		"SECONDARY_DATABASE_ID":     os.Getenv("SECONDARY_DATABASE_ID"),
		"PRIMARY_SCHEMA_PATH":       os.Getenv("PRIMARY_SCHEMA_PATH"),
		"SECONDARY_SCHEMA_PATH":     os.Getenv("SECONDARY_SCHEMA_PATH"),
		"ENVIRONMENT":               os.Getenv("ENVIRONMENT"),
		"LOG_LEVEL":                 os.Getenv("LOG_LEVEL"),
		"TIMEOUT_SECONDS":           os.Getenv("TIMEOUT_SECONDS"),
	}

	// Clean up environment after test
	defer func() {
		for key, value := range originalEnv {
			if value == "" {
				os.Unsetenv(key)
			} else {
				os.Setenv(key, value)
			}
		}
	}()

	t.Run("valid configuration", func(t *testing.T) {
		// Set up valid environment
		os.Setenv("PROJECT_ID", "test-project")
		os.Setenv("INSTANCE_ID", "test-instance")
		os.Setenv("SPANNER_EMULATOR_HOST", "localhost:9010")
		os.Setenv("PRIMARY_DATABASE_ID", "primary-db")
		os.Setenv("SECONDARY_DATABASE_ID", "secondary-db")
		os.Setenv("PRIMARY_SCHEMA_PATH", "/tmp/test-schema")
		os.Setenv("SECONDARY_SCHEMA_PATH", "/tmp/test-cloud-schema")
		os.Setenv("ENVIRONMENT", "test")
		os.Setenv("LOG_LEVEL", "debug")
		os.Setenv("TIMEOUT_SECONDS", "300")

		// Create test directories to pass validation
		require.NoError(t, os.MkdirAll("/tmp/test-schema", 0755))
		require.NoError(t, os.MkdirAll("/tmp/test-cloud-schema", 0755))
		defer os.RemoveAll("/tmp/test-schema")
		defer os.RemoveAll("/tmp/test-cloud-schema")

		config, err := LoadConfig()
		require.NoError(t, err)
		require.NotNil(t, config)

		// Test Spanner config
		assert.Equal(t, "test-project", config.Spanner.ProjectID)
		assert.Equal(t, "test-instance", config.Spanner.InstanceID)
		assert.Equal(t, "localhost:9010", config.Spanner.EmulatorHost)

		// Test Database config
		assert.Equal(t, "primary-db", config.Databases.PrimaryDB)
		assert.Equal(t, "secondary-db", config.Databases.SecondaryDB)

		// Test Paths config
		assert.Equal(t, "/tmp/test-schema", config.Paths.PrimarySchema)
		assert.Equal(t, "/tmp/test-cloud-schema", config.Paths.SecondarySchema)

		// Test Runtime config
		assert.Equal(t, "test", config.Runtime.Environment)
		assert.Equal(t, "debug", config.Runtime.LogLevel)
		assert.Equal(t, 300, config.Runtime.Timeout)
	})

	t.Run("missing required fields", func(t *testing.T) {
		// Clear required environment variables
		os.Unsetenv("PROJECT_ID")
		os.Unsetenv("INSTANCE_ID")
		os.Unsetenv("SPANNER_EMULATOR_HOST")
		os.Unsetenv("PRIMARY_DATABASE_ID")
		os.Unsetenv("SECONDARY_DATABASE_ID")
		os.Unsetenv("PRIMARY_SCHEMA_PATH")
		os.Unsetenv("SECONDARY_SCHEMA_PATH")

		config, err := LoadConfig()
		assert.Error(t, err)
		assert.Nil(t, config)
		assert.Contains(t, err.Error(), "configuration validation failed")
	})
}

func TestConfigHelperMethods(t *testing.T) {
	config := &Config{
		Spanner: SpannerConfig{
			ProjectID:  "test-project",
			InstanceID: "test-instance",
		},
		Databases: DatabasesConfig{
			PrimaryDB:     "primary-db",
			SecondaryDB:   "secondary-db",
		},
		Runtime: RuntimeConfig{
			Environment: "development",
			LogLevel:    "info",
		},
	}

	t.Run("GetDatabaseConfig", func(t *testing.T) {
		dbConfig := config.GetDatabaseConfig("test-db")
		assert.Equal(t, "test-project", dbConfig.ProjectID)
		assert.Equal(t, "test-instance", dbConfig.InstanceID)
		assert.Equal(t, "test-db", dbConfig.DatabaseID)
	})

	t.Run("GetPrimaryDatabaseConfig", func(t *testing.T) {
		dbConfig := config.GetPrimaryDatabaseConfig()
		assert.Equal(t, "primary-db", dbConfig.DatabaseID)
	})

	t.Run("GetSecondaryDatabaseConfig", func(t *testing.T) {
		dbConfig := config.GetSecondaryDatabaseConfig()
		assert.Equal(t, "secondary-db", dbConfig.DatabaseID)
	})

	t.Run("IsDevelopment", func(t *testing.T) {
		assert.True(t, config.IsDevelopment())
		
		config.Runtime.Environment = "production"
		assert.False(t, config.IsDevelopment())
	})

	t.Run("IsProduction", func(t *testing.T) {
		config.Runtime.Environment = "production"
		assert.True(t, config.IsProduction())
		
		config.Runtime.Environment = "development"
		assert.False(t, config.IsProduction())
	})

	t.Run("GetLogLevel", func(t *testing.T) {
		assert.Equal(t, "info", config.GetLogLevel())
	})

	t.Run("GetAbsoluteSchemaPath", func(t *testing.T) {
		absPath, err := config.GetAbsoluteSchemaPath("/tmp/test")
		require.NoError(t, err)
		assert.Contains(t, absPath, "/tmp/test")

		_, err = config.GetAbsoluteSchemaPath("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "schema path cannot be empty")
	})
}