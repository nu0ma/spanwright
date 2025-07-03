package db

import (
	"encoding/json"
	"log"
	"time"

	"cloud.google.com/go/spanner"
)

// MutationBuilder helps build Spanner mutations with type conversion
type MutationBuilder struct {
	SchemaMap map[string]map[string]string
}

// NewMutationBuilder creates a new MutationBuilder
func NewMutationBuilder(schemaMap map[string]map[string]string) *MutationBuilder {
	return &MutationBuilder{
		SchemaMap: schemaMap,
	}
}

// BuildInsertMutation builds an insert mutation with proper type conversion
func (mb *MutationBuilder) BuildInsertMutation(tableName string, columns []string, values []interface{}) *spanner.Mutation {
	// Convert values based on schema information
	convertedValues := make([]interface{}, len(values))
	for i, value := range values {
		if i < len(columns) {
			convertedValues[i] = mb.convertValue(tableName, columns[i], value)
		} else {
			convertedValues[i] = value
		}
	}

	return spanner.Insert(tableName, columns, convertedValues)
}

// ConvertTimeForColumn converts time based on column type information
func (mb *MutationBuilder) ConvertTimeForColumn(t time.Time, tableName, columnName string) interface{} {
	if tableInfo, exists := mb.SchemaMap[tableName]; exists {
		if dataType, exists := tableInfo[columnName]; exists {
			if dataType == "TIMESTAMP" {
				return t // Return time.Time directly for TIMESTAMP columns
			}
		}
	}
	// Default to Unix timestamp for INT64 columns
	return t.Unix()
}

func (mb *MutationBuilder) convertValue(tableName, columnName string, value interface{}) interface{} {
	// Handle time conversion for known timestamp columns
	if t, ok := value.(time.Time); ok {
		return mb.ConvertTimeForColumn(t, tableName, columnName)
	}

	// Handle array conversions
	switch v := value.(type) {
	case []interface{}:
		// Convert to appropriate array type
		if len(v) == 0 {
			return v
		}

		// Check the type of first element to determine array type
		switch v[0].(type) {
		case string:
			var stringArray []string
			for _, item := range v {
				if str, ok := item.(string); ok {
					stringArray = append(stringArray, str)
				}
			}
			return stringArray
		case float64:
			var int64Array []int64
			for _, item := range v {
				if num, ok := item.(float64); ok {
					int64Array = append(int64Array, int64(num))
				}
			}
			return int64Array
		}
		return v
	case float64:
		// Check schema to determine if this should be float64 or int64
		if tableInfo, exists := mb.SchemaMap[tableName]; exists {
			if dataType, exists := tableInfo[columnName]; exists {
				if dataType == "FLOAT64" {
					return v // Keep as float64 for FLOAT64 columns
				}
			}
		}
		// Default: JSON numbers are parsed as float64, convert to int64 for database
		return int64(v)
	case map[string]interface{}:
		// Convert complex objects to JSON strings
		jsonBytes, err := json.Marshal(v)
		if err != nil {
			log.Printf("Warning: failed to marshal object to JSON: %v", err)
			return v
		}
		return string(jsonBytes)
	default:
		return value
	}
}
