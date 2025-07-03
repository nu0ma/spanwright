package data

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseJSONFile(t *testing.T) {
	tests := []struct {
		name        string
		jsonContent string
		expectError bool
		expectedLen int
	}{
		{
			name: "valid JSON with single table",
			jsonContent: `{
				"users": [
					{"id": 1, "name": "John", "active": true},
					{"id": 2, "name": "Jane", "active": false}
				]
			}`,
			expectError: false,
			expectedLen: 1,
		},
		{
			name: "valid JSON with multiple tables",
			jsonContent: `{
				"users": [
					{"id": 1, "name": "John"}
				],
				"posts": [
					{"id": 1, "title": "Test Post", "user_id": 1}
				]
			}`,
			expectError: false,
			expectedLen: 2,
		},
		{
			name: "empty JSON object",
			jsonContent: `{}`,
			expectError: false,
			expectedLen: 0,
		},
		{
			name: "invalid JSON",
			jsonContent: `{invalid json}`,
			expectError: true,
			expectedLen: 0,
		},
		{
			name: "JSON with empty arrays",
			jsonContent: `{
				"users": [],
				"posts": []
			}`,
			expectError: false,
			expectedLen: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary file
			tmpDir := t.TempDir()
			tmpFile := filepath.Join(tmpDir, "test.json")
			
			err := os.WriteFile(tmpFile, []byte(tt.jsonContent), 0644)
			require.NoError(t, err)

			// Parse the JSON
			result, err := ParseJSONFile(tmpFile)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, tt.expectedLen)
			}
		})
	}
}

func TestParseJSONFileWithSpecificContent(t *testing.T) {
	t.Run("parse realistic seed data", func(t *testing.T) {
		jsonContent := `{
			"Billing": [
				{
					"BillingID": "bb333fbf-fdb4-4f6f-8125-3ec1bc9c36c1",
					"Name": "Aeras Corporation",
					"PaymentMethod": 1,
					"PaymentDueType": 5,
					"CreatedAt": 1672531200,
					"UpdatedAt": 1672531200
				}
			],
			"User": [
				{
					"UserID": "user-123",
					"Email": "test@example.com",
					"Active": true,
					"CreatedAt": 1672531200
				}
			]
		}`

		tmpDir := t.TempDir()
		tmpFile := filepath.Join(tmpDir, "seed.json")
		
		err := os.WriteFile(tmpFile, []byte(jsonContent), 0644)
		require.NoError(t, err)

		result, err := ParseJSONFile(tmpFile)
		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Len(t, result, 2)

		// Check Billing table
		billingData, exists := result["Billing"]
		assert.True(t, exists)
		billingArray := billingData.([]interface{})
		assert.Len(t, billingArray, 1)
		
		billing := billingArray[0].(map[string]interface{})
		assert.Equal(t, "bb333fbf-fdb4-4f6f-8125-3ec1bc9c36c1", billing["BillingID"])
		assert.Equal(t, "Aeras Corporation", billing["Name"])
		assert.Equal(t, float64(1), billing["PaymentMethod"]) // JSON numbers are float64
		assert.Equal(t, float64(5), billing["PaymentDueType"])

		// Check User table
		userData, exists := result["User"]
		assert.True(t, exists)
		userArray := userData.([]interface{})
		assert.Len(t, userArray, 1)
		
		user := userArray[0].(map[string]interface{})
		assert.Equal(t, "user-123", user["UserID"])
		assert.Equal(t, "test@example.com", user["Email"])
		assert.Equal(t, true, user["Active"])
	})
}

func TestParseJSONFileNotFound(t *testing.T) {
	result, err := ParseJSONFile("/non/existent/file.json")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "file not found")
}

func TestParseJSONFileInvalidFile(t *testing.T) {
	// Create a directory instead of a file
	tmpDir := t.TempDir()
	
	result, err := ParseJSONFile(tmpDir)
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestParseJSONFileWithDifferentDataTypes(t *testing.T) {
	jsonContent := `{
		"mixed_data": [
			{
				"string_field": "text",
				"int_field": 42,
				"float_field": 3.14,
				"bool_field": true,
				"null_field": null,
				"array_field": [1, 2, 3],
				"object_field": {"nested": "value"}
			}
		]
	}`

	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, "mixed.json")
	
	err := os.WriteFile(tmpFile, []byte(jsonContent), 0644)
	require.NoError(t, err)

	result, err := ParseJSONFile(tmpFile)
	require.NoError(t, err)
	require.NotNil(t, result)

	mixedData := result["mixed_data"]
	mixedArray := mixedData.([]interface{})
	require.Len(t, mixedArray, 1)

	record := mixedArray[0].(map[string]interface{})
	assert.Equal(t, "text", record["string_field"])
	assert.Equal(t, float64(42), record["int_field"])
	assert.Equal(t, 3.14, record["float_field"])
	assert.Equal(t, true, record["bool_field"])
	assert.Nil(t, record["null_field"])
	assert.IsType(t, []interface{}{}, record["array_field"])
	assert.IsType(t, map[string]interface{}{}, record["object_field"])
}