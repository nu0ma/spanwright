package config

import (
	"fmt"
)

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	ProjectID  string `json:"project_id"`
	InstanceID string `json:"instance_id"`
	DatabaseID string `json:"database_id"`
}

// Validate validates the database configuration
func (c *DatabaseConfig) Validate() error {
	var errors ValidationErrors

	if err := ValidateProjectID(c.ProjectID); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateInstanceID(c.InstanceID); err != nil {
		errors = append(errors, err.(ValidationError))
	}
	if err := ValidateDatabaseID(c.DatabaseID); err != nil {
		errors = append(errors, err.(ValidationError))
	}

	if errors.HasErrors() {
		return errors
	}
	return nil
}

// NewDatabaseConfig creates a new DatabaseConfig with required environment variables
func NewDatabaseConfig(databaseID string) (*DatabaseConfig, error) {
	projectID, err := GetRequiredEnvWithValidation("PROJECT_ID")
	if err != nil {
		return nil, err
	}

	instanceID, err := GetRequiredEnvWithValidation("INSTANCE_ID")
	if err != nil {
		return nil, err
	}

	// Validate the provided database ID
	if err := ValidateDatabaseID(databaseID); err != nil {
		return nil, fmt.Errorf("invalid database ID: %w", err)
	}

	return &DatabaseConfig{
		ProjectID:  projectID,
		InstanceID: instanceID,
		DatabaseID: databaseID,
	}, nil
}

// NewDatabaseConfigFromConfig creates a DatabaseConfig from a Config struct
func NewDatabaseConfigFromConfig(config *Config, databaseID string) (*DatabaseConfig, error) {
	if config == nil {
		return nil, fmt.Errorf("config cannot be nil")
	}
	
	// Validate the provided database ID
	if err := ValidateDatabaseID(databaseID); err != nil {
		return nil, fmt.Errorf("invalid database ID: %w", err)
	}

	return &DatabaseConfig{
		ProjectID:  config.Spanner.ProjectID,
		InstanceID: config.Spanner.InstanceID,
		DatabaseID: databaseID,
	}, nil
}

// DatabasePath returns the full Spanner database path
func (c *DatabaseConfig) DatabasePath() string {
	return fmt.Sprintf("projects/%s/instances/%s/databases/%s", c.ProjectID, c.InstanceID, c.DatabaseID)
}

// InstancePath returns the full Spanner instance path
func (c *DatabaseConfig) InstancePath() string {
	return fmt.Sprintf("projects/%s/instances/%s", c.ProjectID, c.InstanceID)
}

// ProjectPath returns the full project path
func (c *DatabaseConfig) ProjectPath() string {
	return fmt.Sprintf("projects/%s", c.ProjectID)
}

// String returns a string representation of the database config
func (c *DatabaseConfig) String() string {
	return fmt.Sprintf("DatabaseConfig{ProjectID:%s, InstanceID:%s, DatabaseID:%s}", 
		c.ProjectID, c.InstanceID, c.DatabaseID)
}
