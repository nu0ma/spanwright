package config

// Database configuration constants
// Note: Table names and column names are dynamically loaded from YAML configs
const (
	DefaultProjectID  = "test-project"
	DefaultInstanceID = "test-instance"

	// Instance configuration
	DefaultInstanceConfig    = "emulator-config"
	DefaultInstanceName      = "Test Instance"
	DefaultInstanceNodeCount = 1

	// Spanner emulator
	DefaultSpannerEmulatorHost = "localhost:9010"
)

