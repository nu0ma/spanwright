package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateSeedFilePath(t *testing.T) {
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
			errorMsg:    "seed file path cannot be empty",
		},
		{
			name:        "path traversal attempt",
			path:        "../../../etc/passwd",
			expectError: true,
			errorMsg:    "path traversal not allowed",
		},
		{
			name:        "path traversal with relative path",
			path:        "data/../../../etc/passwd",
			expectError: true,
			errorMsg:    "path traversal not allowed",
		},
		{
			name:        "non-existent file",
			path:        "/tmp/non-existent-seed.json",
			expectError: true,
			errorMsg:    "seed file does not exist",
		},
		{
			name:        "invalid extension - txt",
			path:        "",
			expectError: true,
			errorMsg:    "seed file must have .json extension",
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-seed-*.txt")
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
			name:        "invalid extension - yaml",
			path:        "",
			expectError: true,
			errorMsg:    "seed file must have .json extension",
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-seed-*.yaml")
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
			errorMsg:    "seed file must be a regular file",
			setupFunc: func(t *testing.T) string {
				tempDir, err := os.MkdirTemp("", "test-seed-dir-*.json")
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
			errorMsg:    "seed file too large",
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-large-seed-*.json")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				// Write more than 100MB
				largeData := make([]byte, 101*1024*1024)
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
			name:        "valid json file",
			path:        "",
			expectError: false,
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-valid-seed-*.json")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				if _, err := tempFile.WriteString(`{"test": "value"}`); err != nil {
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
			name:        "valid json file with complex data",
			path:        "",
			expectError: false,
			setupFunc: func(t *testing.T) string {
				tempFile, err := os.CreateTemp("", "test-complex-seed-*.json")
				if err != nil {
					t.Fatalf("Failed to create temp file: %v", err)
				}
				complexJSON := `{
					"Users": [
						{
							"id": "1",
							"name": "Test User",
							"email": "test@example.com",
							"created_at": "2023-01-01T00:00:00Z"
						}
					],
					"Orders": [
						{
							"id": "order-1",
							"user_id": "1",
							"amount": 100.50,
							"status": "completed"
						}
					]
				}`
				if _, err := tempFile.WriteString(complexJSON); err != nil {
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

			err := validateSeedFilePath(testPath)

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

func TestValidateSeedFilePathEdgeCases(t *testing.T) {
	// Test case-insensitive extension checking
	t.Run("case insensitive json extension", func(t *testing.T) {
		// Test .JSON extension
		tempFile, err := os.CreateTemp("", "test-seed-*.JSON")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.WriteString(`{"test": "value"}`)
		tempFile.Close()

		err = validateSeedFilePath(tempFile.Name())
		if err != nil {
			t.Errorf("Expected .JSON extension to be accepted, got error: %v", err)
		}
	})

	// Test file size boundary conditions
	t.Run("file size exactly at limit", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-boundary-seed-*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())

		// Write exactly 100MB
		data := make([]byte, 100*1024*1024)
		for i := range data {
			data[i] = 'a'
		}
		if _, err := tempFile.Write(data); err != nil {
			t.Fatalf("Failed to write data: %v", err)
		}
		tempFile.Close()

		err = validateSeedFilePath(tempFile.Name())
		if err != nil {
			t.Errorf("Expected file at size limit to be accepted, got error: %v", err)
		}
	})

	// Test file size just over limit
	t.Run("file size just over limit", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-overlimit-seed-*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())

		// Write 100MB + 1 byte
		data := make([]byte, 100*1024*1024+1)
		for i := range data {
			data[i] = 'a'
		}
		if _, err := tempFile.Write(data); err != nil {
			t.Fatalf("Failed to write data: %v", err)
		}
		tempFile.Close()

		err = validateSeedFilePath(tempFile.Name())
		if err == nil {
			t.Errorf("Expected file over size limit to be rejected")
		}
		if !strings.Contains(err.Error(), "seed file too large") {
			t.Errorf("Expected error about file size, got: %v", err)
		}
	})

	// Test path cleaning behavior
	t.Run("path cleaning", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-path-seed-*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.WriteString(`{"test": "value"}`)
		tempFile.Close()

		// Test path with unnecessary separators
		basePath := filepath.Dir(tempFile.Name())
		fileName := filepath.Base(tempFile.Name())
		messyPath := filepath.Join(basePath, ".", fileName)

		err = validateSeedFilePath(messyPath)
		if err != nil {
			t.Errorf("Expected cleaned path to be accepted, got error: %v", err)
		}
	})

	// Test various JSON file content types
	t.Run("empty json file", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-empty-seed-*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		tempFile.Close()

		err = validateSeedFilePath(tempFile.Name())
		if err != nil {
			t.Errorf("Expected empty JSON file to pass validation, got error: %v", err)
		}
	})

	// Test file with special characters in name
	t.Run("special characters in filename", func(t *testing.T) {
		tempDir := t.TempDir()
		specialPath := filepath.Join(tempDir, "test-seed_file-123.json")
		
		file, err := os.Create(specialPath)
		if err != nil {
			t.Fatalf("Failed to create file with special chars: %v", err)
		}
		file.WriteString(`{"test": "value"}`)
		file.Close()

		err = validateSeedFilePath(specialPath)
		if err != nil {
			t.Errorf("Expected file with special characters to be accepted, got error: %v", err)
		}
	})
}

// Test behavior with different file permissions
func TestValidateSeedFilePathPermissions(t *testing.T) {
	// Skip on Windows as it doesn't have the same permission model
	if os.Getenv("GOOS") == "windows" {
		t.Skip("Skipping permission tests on Windows")
	}

	t.Run("unreadable file", func(t *testing.T) {
		tempFile, err := os.CreateTemp("", "test-unreadable-seed-*.json")
		if err != nil {
			t.Fatalf("Failed to create temp file: %v", err)
		}
		defer os.Remove(tempFile.Name())
		
		tempFile.WriteString(`{"test": "value"}`)
		tempFile.Close()

		// Remove read permissions
		err = os.Chmod(tempFile.Name(), 0000)
		if err != nil {
			t.Fatalf("Failed to change file permissions: %v", err)
		}

		// Restore permissions for cleanup
		defer os.Chmod(tempFile.Name(), 0644)

		err = validateSeedFilePath(tempFile.Name())
		// Note: os.Stat() can succeed even with no read permissions
		// The function validates file existence and type, not read permissions
		// This is acceptable since the actual read operation will fail later
		// if permissions are insufficient
		t.Logf("Permission test result: %v", err)
	})
}

// Benchmark tests for performance
func BenchmarkValidateSeedFilePath(b *testing.B) {
	// Create a test file
	tempFile, err := os.CreateTemp("", "benchmark-seed-*.json")
	if err != nil {
		b.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	tempFile.WriteString(`{"benchmark": "test"}`)
	tempFile.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validateSeedFilePath(tempFile.Name())
	}
}

// Test file extension validation specifically
func TestSeedFileExtensionValidation(t *testing.T) {
	testCases := []struct {
		name      string
		extension string
		valid     bool
	}{
		{"lowercase json", ".json", true},
		{"uppercase JSON", ".JSON", true},
		{"mixed case Json", ".Json", true},
		{"yaml extension", ".yaml", false},
		{"yml extension", ".yml", false},
		{"txt extension", ".txt", false},
		{"xml extension", ".xml", false},
		{"no extension", "", false},
		{"multiple dots", ".backup.json", true},
		{"json in middle", ".json.backup", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			tempDir := t.TempDir()
			fileName := "test-seed" + tc.extension
			filePath := filepath.Join(tempDir, fileName)

			// Create the file
			file, err := os.Create(filePath)
			if err != nil {
				t.Fatalf("Failed to create test file: %v", err)
			}
			file.WriteString(`{"test": "value"}`)
			file.Close()

			err = validateSeedFilePath(filePath)
			if tc.valid && err != nil {
				t.Errorf("Expected valid extension %s to pass, got error: %v", tc.extension, err)
			}
			if !tc.valid && err == nil {
				t.Errorf("Expected invalid extension %s to fail, but it passed", tc.extension)
			}
		})
	}
}