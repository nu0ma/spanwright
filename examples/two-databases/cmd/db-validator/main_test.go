package main

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"two-databases/internal/data"
)

func TestValidateConfigFilePath(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		expectError bool
		errorMsg    string
		setupFunc   func(t *testing.T) string // returns actual path to use
		cleanupFunc func(t *testing.T, path string)
	}{
		{
			name:        "empty path",
			path:        "",
			expectError: true,
			errorMsg:    "config file path cannot be empty",
		},
		{
			name:        "path traversal attempt",
			path:        "../../../etc/passwd",
			expectError: true,
			errorMsg:    "path traversal not allowed",
		},
		{
			name:        "path traversal with relative path",
			path:        "config/../../../etc/passwd",
			expectError: true,
			errorMsg:    "path traversal not allowed",
		},
		{
			name:        "non-existent file",
			path:        "/tmp/non-existent-config.yaml",
			expectError: true,
			errorMsg:    "config file does not exist",
		},
		{
			name:        "invalid extension",
			path:        "",
			expectError: true,
			errorMsg:    "config file must have .yaml or .yml extension",
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-config-*.txt")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				tempFile.Close()
				return tempFile.Name()
			},
			cleanupFunc: func(t *testing.T, path string) {
				os.Remove(path)
			},
		},
		{
			name:        "directory instead of file",
			path:        "",
			expectError: true,
			errorMsg:    "config file must be a regular file",
			setupFunc: func(t *testing.T) string {
				tempDir, err := os.MkdirTemp("", "test-config-dir-*.yaml")
				if err != nil {
					t.Fatalf("Failed to create temp dir: %v", err)
				}
				return tempDir
			},
			cleanupFunc: func(t *testing.T, path string) {
				os.RemoveAll(path)
			},
		},
		{
			name:        "file too large",
			path:        "",
			expectError: true,
			errorMsg:    "config file too large",
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-large-config-*.yaml")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				// Write more than 10MB
				largeData := make([]byte, 11*1024*1024)
				for i := range largeData {
					largeData[i] = 'a'
				}
				if _, err := tempFile.Write(largeData); err != nil {
					tempFile.Close()
					os.Remove(tempFile.Name())
					t.Fatalf("Failed to write large data: %v", err)
				}
				tempFile.Close()
				return tempFile.Name()
			},
			cleanupFunc: func(t *testing.T, path string) {
				os.Remove(path)
			},
		},
		{
			name:        "valid yaml file",
			path:        "",
			expectError: false,
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-valid-config-*.yaml")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				if _, err := tempFile.WriteString("test: value\n"); err != nil {
					tempFile.Close()
					os.Remove(tempFile.Name())
					t.Fatalf("Failed to write test data: %v", err)
				}
				tempFile.Close()
				return tempFile.Name()
			},
			cleanupFunc: func(t *testing.T, path string) {
				os.Remove(path)
			},
		},
		{
			name:        "valid yml file",
			path:        "",
			expectError: false,
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-valid-config-*.yml")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				if _, err := tempFile.WriteString("test: value\n"); err != nil {
					tempFile.Close()
					os.Remove(tempFile.Name())
					t.Fatalf("Failed to write test data: %v", err)
				}
				tempFile.Close()
				return tempFile.Name()
			},
			cleanupFunc: func(t *testing.T, path string) {
				os.Remove(path)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testPath := tt.path

			// Setup test environment if needed
			if tt.setupFunc != nil {
				testPath = tt.setupFunc(t)
			}

			// Cleanup after test if needed
			if tt.cleanupFunc != nil {
				defer tt.cleanupFunc(t, testPath)
			}

			err := validateConfigFilePath(testPath)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if !strings.Contains(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error message to contain '%s', got: %s", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error but got: %v", err)
				}
			}
		})
	}
}

func TestOutputHuman(t *testing.T) {
	tests := []struct {
		name           string
		result         *data.ValidationResult
		expectedOutput []string // strings that should appear in output
	}{
		{
			name: "successful validation",
			result: &data.ValidationResult{
				DatabaseID: "test-db",
				Success:    true,
				Results: map[string]data.TableValidationResult{
					"Users": {
						Success:  true,
						RowCount: 5,
						Messages: []string{"All validations passed"},
						Errors:   []string{},
					},
					"Orders": {
						Success:  true,
						RowCount: 10,
						Messages: []string{"Table looks good"},
						Errors:   []string{},
					},
				},
				Errors: []string{},
			},
			expectedOutput: []string{
				"🔍 Database Validation Results: test-db",
				"✅ Table: Users (rows: 5)",
				"✅ Table: Orders (rows: 10)",
				"Overall Result: ✅ PASSED",
				"All validations passed",
				"Table looks good",
			},
		},
		{
			name: "failed validation with errors",
			result: &data.ValidationResult{
				DatabaseID: "test-db",
				Success:    false,
				Results: map[string]data.TableValidationResult{
					"Users": {
						Success:  false,
						RowCount: 3,
						Messages: []string{},
						Errors:   []string{"Row count mismatch", "Invalid data type"},
					},
					"Orders": {
						Success:  true,
						RowCount: 10,
						Messages: []string{"Table OK"},
						Errors:   []string{},
					},
				},
				Errors: []string{"Global validation error", "Database connection issue"},
			},
			expectedOutput: []string{
				"🔍 Database Validation Results: test-db",
				"❌ Table: Users (rows: 3)",
				"✅ Table: Orders (rows: 10)",
				"Overall Result: ❌ FAILED",
				"❌ Row count mismatch",
				"❌ Invalid data type",
				"Global Errors:",
				"❌ Global validation error",
				"❌ Database connection issue",
			},
		},
		{
			name: "empty results",
			result: &data.ValidationResult{
				DatabaseID: "empty-db",
				Success:    true,
				Results:    map[string]data.TableValidationResult{},
				Errors:     []string{},
			},
			expectedOutput: []string{
				"🔍 Database Validation Results: empty-db",
				"Overall Result: ✅ PASSED",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Capture stdout
			oldStdout := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			outputHuman(tt.result)

			// Restore stdout and read captured output
			w.Close()
			os.Stdout = oldStdout
			
			var buf bytes.Buffer
			io.Copy(&buf, r)
			output := buf.String()

			// Check that all expected strings appear in output
			for _, expected := range tt.expectedOutput {
				if !strings.Contains(output, expected) {
					t.Errorf("Expected output to contain '%s', but it didn't.\nFull output:\n%s", expected, output)
				}
			}
		})
	}
}

func TestValidateConfigFilePathEdgeCases(t *testing.T) {
	// Test case-insensitive extension checking
	t.Run("case insensitive extensions", func(t *testing.T) {
		// Test .YAML extension
		tempFile, err := os.CreateTemp("", "test-config-*.YAML")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.WriteString("test: value\n")
		tempFile.Close()

		err = validateConfigFilePath(tempFile.Name())
		if err != nil {
			t.Errorf("Expected .YAML extension to be accepted, got error: %v", err)
		}

		// Test .YML extension
		tempFile2, err := os.CreateTemp("", "test-config-*.YML")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile2.Name())
		tempFile2.WriteString("test: value\n")
		tempFile2.Close()

		err = validateConfigFilePath(tempFile2.Name())
		if err != nil {
			t.Errorf("Expected .YML extension to be accepted, got error: %v", err)
		}
	})

	// Test file size boundary
	t.Run("file size exactly at limit", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-boundary-config-*.yaml")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())

		// Write exactly 10MB
		data := make([]byte, 10*1024*1024)
		for i := range data {
			data[i] = 'a'
		}
		if _, err := tempFile.Write(data); err != nil {
			t.Fatalf("Failed to write data: %v", err)
		}
		tempFile.Close()

		err = validateConfigFilePath(tempFile.Name())
		if err != nil {
			t.Errorf("Expected file at size limit to be accepted, got error: %v", err)
		}
	})

	// Test path cleaning behavior
	t.Run("path cleaning", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-path-config-*.yaml")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.WriteString("test: value\n")
		tempFile.Close()

		// Test path with unnecessary separators
		basePath := filepath.Dir(tempFile.Name())
		fileName := filepath.Base(tempFile.Name())
		messyPath := filepath.Join(basePath, ".", fileName)

		err = validateConfigFilePath(messyPath)
		if err != nil {
			t.Errorf("Expected cleaned path to be accepted, got error: %v", err)
		}
	})
}

// Benchmark tests for performance
func BenchmarkValidateConfigFilePath(b *testing.B) {
	// Create a test file
	tempFile, err := os.CreateTemp("", "benchmark-config-*.yaml")
	if err != nil {
		b.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	tempFile.WriteString("test: value\n")
	tempFile.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validateConfigFilePath(tempFile.Name())
	}
}

func BenchmarkOutputHuman(b *testing.B) {
	result := &data.ValidationResult{
		DatabaseID: "benchmark-db",
		Success:    true,
		Results: map[string]data.TableValidationResult{
			"TestTable": {
				Success:  true,
				RowCount: 100,
				Messages: []string{"Benchmark test"},
				Errors:   []string{},
			},
		},
		Errors: []string{},
	}

	// Redirect output to discard
	oldStdout := os.Stdout
	devNull, _ := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
	os.Stdout = devNull

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		outputHuman(result)
	}

	// Restore stdout
	os.Stdout = oldStdout
	devNull.Close()
}