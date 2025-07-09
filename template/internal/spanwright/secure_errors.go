package spanwright

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
)

// ErrorCode represents standard error codes for the application
type ErrorCode string

const (
	ErrCodeConfigLoad      ErrorCode = "CONFIG_001"
	ErrCodeDatabaseConnect ErrorCode = "DATABASE_001"
	ErrCodeValidation      ErrorCode = "VALIDATION_001"
	ErrCodeFileSystem      ErrorCode = "FILESYSTEM_001"
	ErrCodeNetwork         ErrorCode = "NETWORK_001"
	ErrCodeGeneric         ErrorCode = "GENERIC_001"
)

// SecureError represents a sanitized error safe for user display
type SecureError struct {
	Code        ErrorCode
	Message     string
	UserMessage string
	Context     string
	Internal    error
}

func (e SecureError) Error() string {
	return e.UserMessage
}

// SensitivePatterns contains regex patterns to remove sensitive information from error messages
var SensitivePatterns = []*regexp.Regexp{
	regexp.MustCompile(`/Users/[^/\s]+`),       // Remove user paths
	regexp.MustCompile(`/home/[^/\s]+`),        // Remove home paths
	regexp.MustCompile(`/tmp/[^/\s]+`),         // Remove temp paths
	regexp.MustCompile(`/var/[^/\s]+`),         // Remove var paths
	regexp.MustCompile(`C:\\Users\\[^\\s]+`),   // Remove Windows user paths
	regexp.MustCompile(`[A-Z]:\\[^\\s]+`),      // Remove Windows absolute paths
	regexp.MustCompile(`password[=:]\s*\S+`),   // Remove password values
	regexp.MustCompile(`token[=:]\s*\S+`),      // Remove token values
	regexp.MustCompile(`key[=:]\s*\S+`),        // Remove key values
	regexp.MustCompile(`secret[=:]\s*\S+`),     // Remove secret values
	regexp.MustCompile(`\.env\S*`),             // Remove env file references
	regexp.MustCompile(`DSN:\s*\S+`),           // Remove DSN strings
	regexp.MustCompile(`connection string:\s*\S+`), // Remove connection strings
}

// SystemInfoPatterns contains patterns to remove system information
var SystemInfoPatterns = []*regexp.Regexp{
	regexp.MustCompile(`Go version go[\d.]+`),
	regexp.MustCompile(`runtime\.Version\(\):\s*\S+`),
	regexp.MustCompile(`runtime\.GOOS:\s*\S+`),
	regexp.MustCompile(`runtime\.GOARCH:\s*\S+`),
	regexp.MustCompile(`hostname:\s*\S+`),
}

// UserFriendlyMessages maps error patterns to user-friendly messages
var UserFriendlyMessages = map[string]string{
	"no such file or directory":     "Required file not found. Please check your configuration.",
	"permission denied":             "Permission denied. Please check file permissions.",
	"connection refused":            "Connection refused. Please check if the service is running.",
	"timeout":                       "Operation timed out. Please try again.",
	"network is unreachable":        "Network error. Please check your connection.",
	"validation failed":             "Input validation failed. Please check your input.",
	"invalid database":              "Database configuration error. Please check your settings.",
	"invalid configuration":         "Configuration error. Please check your settings.",
	"failed to connect":             "Database connection failed. Please check your configuration.",
	"failed to load":                "Configuration loading failed. Please check your settings.",
	"failed to parse":               "Configuration parsing failed. Please check the format.",
	"failed to validate":            "Validation failed. Please check your input.",
	"failed to read":                "File reading failed. Please check the file exists and permissions.",
	"failed to write":               "File writing failed. Please check permissions and disk space.",
	"failed to create":              "Resource creation failed. Please check permissions.",
	"failed to delete":              "Resource deletion failed. Please check permissions.",
	"failed to execute":             "Operation execution failed. Please try again.",
	"context deadline exceeded":     "Operation timed out. Please try again or increase timeout.",
	"context canceled":              "Operation was canceled. Please try again.",
}

// SanitizeErrorMessage removes sensitive information from error messages
func SanitizeErrorMessage(message string) string {
	sanitized := message
	
	// Remove sensitive patterns
	for _, pattern := range SensitivePatterns {
		sanitized = pattern.ReplaceAllString(sanitized, "[REDACTED]")
	}
	
	// Remove system information patterns
	for _, pattern := range SystemInfoPatterns {
		sanitized = pattern.ReplaceAllString(sanitized, "[SYSTEM INFO]")
	}
	
	return sanitized
}

// GetUserFriendlyMessage returns a user-friendly error message
func GetUserFriendlyMessage(err error) string {
	if err == nil {
		return ""
	}
	
	errStr := strings.ToLower(err.Error())
	
	// Check for known error patterns
	for pattern, message := range UserFriendlyMessages {
		if strings.Contains(errStr, pattern) {
			return message
		}
	}
	
	// Default sanitized message
	return SanitizeErrorMessage(err.Error())
}

// NewSecureError creates a new secure error with sanitized user message
func NewSecureError(code ErrorCode, message string, context string, internal error) *SecureError {
	userMessage := GetUserFriendlyMessage(internal)
	if userMessage == "" {
		userMessage = "An error occurred. Please check your input and try again."
	}
	
	return &SecureError{
		Code:        code,
		Message:     SanitizeErrorMessage(message),
		UserMessage: userMessage,
		Context:     context,
		Internal:    internal,
	}
}

// LogSecurely logs errors with appropriate detail level based on environment
func LogSecurely(err error, context string) {
	timestamp := time.Now().Format(time.RFC3339)
	
	// Determine if we're in development mode
	isDevelopment := os.Getenv("ENVIRONMENT") == "development" || os.Getenv("NODE_ENV") == "development"
	
	if isDevelopment {
		// In development, log full error details
		log.Printf("[%s] [%s] Full error: %v", timestamp, context, err)
	} else {
		// In production, log only sanitized information
		userMessage := GetUserFriendlyMessage(err)
		log.Printf("[%s] [%s] Error: %s", timestamp, context, userMessage)
	}
}

// WrapConfigError wraps configuration-related errors securely
func WrapConfigError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeConfigLoad, "Configuration error", context, err)
}

// WrapDatabaseError wraps database-related errors securely
func WrapDatabaseError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeDatabaseConnect, "Database error", context, err)
}

// WrapValidationError wraps validation-related errors securely
func WrapValidationError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeValidation, "Validation error", context, err)
}

// WrapFileSystemError wraps file system-related errors securely
func WrapFileSystemError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeFileSystem, "File system error", context, err)
}

// WrapNetworkError wraps network-related errors securely
func WrapNetworkError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeNetwork, "Network error", context, err)
}

// WrapGenericError wraps generic errors securely
func WrapGenericError(err error, context string) error {
	if err == nil {
		return nil
	}
	
	LogSecurely(err, context)
	return NewSecureError(ErrCodeGeneric, "Operation failed", context, err)
}

// SafeLog logs messages with sensitive information removed
func SafeLog(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	sanitized := SanitizeErrorMessage(message)
	log.Print(sanitized)
}

// SafeLogf logs formatted messages with sensitive information removed
func SafeLogf(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)
	sanitized := SanitizeErrorMessage(message)
	log.Printf(sanitized)
}

// SafeErrorLog logs error messages with sensitive information removed
func SafeErrorLog(err error, context string) {
	if err == nil {
		return
	}
	
	LogSecurely(err, context)
}