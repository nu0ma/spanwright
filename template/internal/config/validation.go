package config

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// ValidationError represents a configuration validation error
type ValidationError struct {
	Field   string
	Value   string
	Message string
	Suggestion string
}

func (e ValidationError) Error() string {
	if e.Suggestion != "" {
		return fmt.Sprintf("validation failed for %s='%s': %s. Suggestion: %s", e.Field, e.Value, e.Message, e.Suggestion)
	}
	return fmt.Sprintf("validation failed for %s='%s': %s", e.Field, e.Value, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return "no validation errors"
	}
	
	var messages []string
	for _, err := range e {
		messages = append(messages, err.Error())
	}
	return fmt.Sprintf("configuration validation failed:\n  - %s", strings.Join(messages, "\n  - "))
}

func (e ValidationErrors) HasErrors() bool {
	return len(e) > 0
}

// ValidateProjectID validates a Google Cloud project ID
func ValidateProjectID(projectID string) error {
	if projectID == "" {
		return ValidationError{
			Field:   "PROJECT_ID",
			Value:   projectID,
			Message: "cannot be empty",
			Suggestion: "set PROJECT_ID in .env file",
		}
	}
	
	// Project ID pattern: lowercase letters, numbers, and hyphens (6-30 chars)
	pattern := regexp.MustCompile(`^[a-z][a-z0-9-]{4,28}[a-z0-9]$`)
	if !pattern.MatchString(projectID) {
		return ValidationError{
			Field:   "PROJECT_ID",
			Value:   projectID,
			Message: "invalid format",
			Suggestion: "use lowercase letters, numbers, and hyphens (6-30 characters)",
		}
	}
	
	return nil
}

// ValidateInstanceID validates a Spanner instance ID
func ValidateInstanceID(instanceID string) error {
	if instanceID == "" {
		return ValidationError{
			Field:   "INSTANCE_ID",
			Value:   instanceID,
			Message: "cannot be empty",
			Suggestion: "set INSTANCE_ID in .env file",
		}
	}
	
	// Instance ID pattern: lowercase letters, numbers, and hyphens (2-64 chars)
	pattern := regexp.MustCompile(`^[a-z][a-z0-9-]{0,62}[a-z0-9]$`)
	if !pattern.MatchString(instanceID) {
		return ValidationError{
			Field:   "INSTANCE_ID",
			Value:   instanceID,
			Message: "invalid format",
			Suggestion: "use lowercase letters, numbers, and hyphens (2-64 characters)",
		}
	}
	
	return nil
}

// ValidateDatabaseID validates a Spanner database ID
func ValidateDatabaseID(databaseID string) error {
	if databaseID == "" {
		return ValidationError{
			Field:   "DATABASE_ID",
			Value:   databaseID,
			Message: "cannot be empty",
			Suggestion: "provide a valid database ID",
		}
	}
	
	// Database ID pattern: lowercase letters, numbers, underscores, and hyphens (2-30 chars)
	pattern := regexp.MustCompile(`^[a-z][a-z0-9_-]{0,28}[a-z0-9]$`)
	if !pattern.MatchString(databaseID) {
		return ValidationError{
			Field:   "DATABASE_ID",
			Value:   databaseID,
			Message: "invalid format",
			Suggestion: "use lowercase letters, numbers, underscores, and hyphens (2-30 characters)",
		}
	}
	
	return nil
}

// ValidateSpannerEmulatorHost validates the Spanner emulator host
func ValidateSpannerEmulatorHost(host string) error {
	if host == "" {
		return ValidationError{
			Field:   "SPANNER_EMULATOR_HOST",
			Value:   host,
			Message: "cannot be empty",
			Suggestion: "set SPANNER_EMULATOR_HOST=localhost:9010 in .env file",
		}
	}
	
	// Parse as URL-like format or host:port
	if strings.Contains(host, "://") {
		// Handle URL format
		u, err := url.Parse(host)
		if err != nil {
			return ValidationError{
				Field:   "SPANNER_EMULATOR_HOST",
				Value:   host,
				Message: "invalid URL format",
				Suggestion: "use format like 'localhost:9010' or 'http://localhost:9010'",
			}
		}
		host = u.Host
	}
	
	// Validate host:port format
	hostPart, port, err := net.SplitHostPort(host)
	if err != nil {
		return ValidationError{
			Field:   "SPANNER_EMULATOR_HOST",
			Value:   host,
			Message: "invalid host:port format",
			Suggestion: "use format like 'localhost:9010'",
		}
	}
	
	if hostPart == "" {
		return ValidationError{
			Field:   "SPANNER_EMULATOR_HOST",
			Value:   host,
			Message: "hostname cannot be empty",
			Suggestion: "use 'localhost:9010' for local emulator",
		}
	}
	
	if port == "" {
		return ValidationError{
			Field:   "SPANNER_EMULATOR_HOST",
			Value:   host,
			Message: "port cannot be empty",
			Suggestion: "use port 9010 for Spanner emulator",
		}
	}
	
	return nil
}

// ValidateSchemaPath validates a schema directory path
func ValidateSchemaPath(path, envVarName string) error {
	if path == "" {
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: "cannot be empty",
			Suggestion: fmt.Sprintf("set %s to a valid directory path in .env file", envVarName),
		}
	}
	
	// Convert to absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: "invalid path format",
			Suggestion: "use an absolute path to the schema directory",
		}
	}
	
	// Check if path exists
	info, err := os.Stat(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return ValidationError{
				Field:   envVarName,
				Value:   path,
				Message: "directory does not exist",
				Suggestion: "ensure the schema directory exists and is accessible",
			}
		}
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: fmt.Sprintf("cannot access path: %v", err),
			Suggestion: "check file permissions and path validity",
		}
	}
	
	if !info.IsDir() {
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: "path is not a directory",
			Suggestion: "provide path to a directory containing schema files",
		}
	}
	
	return nil
}

// ValidateOptionalPath validates an optional file path
func ValidateOptionalPath(path, envVarName string) error {
	if path == "" {
		// Optional paths can be empty
		return nil
	}
	
	// Convert to absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: "invalid path format",
			Suggestion: "use a valid file path or leave empty",
		}
	}
	
	// Check if path exists (for optional paths, we only warn about non-existence)
	if _, err := os.Stat(absPath); err != nil {
		if os.IsNotExist(err) {
			// For optional paths, we don't fail on non-existence
			// but we could log a warning in the future
			return nil
		}
		return ValidationError{
			Field:   envVarName,
			Value:   path,
			Message: fmt.Sprintf("cannot access path: %v", err),
			Suggestion: "check file permissions and path validity",
		}
	}
	
	return nil
}