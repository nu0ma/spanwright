package db

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/spanner"
)

// AutoMutationBuilder automatically builds mutations from schema and seed data
type AutoMutationBuilder struct {
	schemaMap        map[string]map[string]string
	availableTables  []string
	mutationBuilder  *MutationBuilder
}

// NewAutoMutationBuilder creates a new AutoMutationBuilder
func NewAutoMutationBuilder(schemaMap map[string]map[string]string, availableTables []string) *AutoMutationBuilder {
	return &AutoMutationBuilder{
		schemaMap:       schemaMap,
		availableTables: availableTables,
		mutationBuilder: NewMutationBuilder(schemaMap),
	}
}

// BuildMutationsFromSeedData automatically builds mutations from seed data
func (amb *AutoMutationBuilder) BuildMutationsFromSeedData(seedData map[string]interface{}) ([]*spanner.Mutation, error) {
	var mutations []*spanner.Mutation
	
	log.Printf("🔍 AutoMutationBuilder: Processing seed data with %d tables", len(seedData))
	log.Printf("🔍 Available tables: %v", amb.availableTables)
	
	// Process each table in the seed data
	for seedTableName, tableData := range seedData {
		log.Printf("🔍 Processing seed table: %s", seedTableName)
		
		// Convert seed table name to actual schema table name
		actualTableName := ConvertTableName(seedTableName, amb.availableTables)
		log.Printf("🔍 Converted '%s' -> '%s'", seedTableName, actualTableName)
		
		if !ValidateTableName(actualTableName, amb.availableTables) {
			log.Printf("⚠️  Table %s (from seed key %s) not found in schema, skipping", actualTableName, seedTableName)
			continue
		}
		
		// Get schema information for this table
		tableSchema, exists := amb.schemaMap[actualTableName]
		if !exists {
			log.Printf("⚠️  Schema information not found for table %s, skipping", actualTableName)
			log.Printf("🔍 Available schema tables: %v", getSchemaTableNames(amb.schemaMap))
			continue
		}
		
		log.Printf("🔍 Found schema for %s with %d columns: %v", actualTableName, len(tableSchema), tableSchema)
		
		// Build mutation for this table
		mutation, err := amb.buildTableMutation(actualTableName, tableSchema, tableData)
		if err != nil {
			log.Printf("❌ Failed to build mutation for table %s: %v", actualTableName, err)
			continue
		}
		
		if mutation != nil {
			mutations = append(mutations, mutation)
			log.Printf("✅ Prepared %s data for insertion", actualTableName)
		} else {
			log.Printf("⚠️  No mutation generated for table %s", actualTableName)
		}
	}
	
	log.Printf("🔍 AutoMutationBuilder: Generated %d mutations total", len(mutations))
	return mutations, nil
}

// Helper function to get schema table names for debugging
func getSchemaTableNames(schemaMap map[string]map[string]string) []string {
	var names []string
	for tableName := range schemaMap {
		names = append(names, tableName)
	}
	return names
}

// buildTableMutation builds a mutation for a single table
func (amb *AutoMutationBuilder) buildTableMutation(tableName string, tableSchema map[string]string, tableData interface{}) (*spanner.Mutation, error) {
	// Handle both array and object formats
	var dataItems []map[string]interface{}
	
	// Check if data is an array
	if dataArray, ok := tableData.([]interface{}); ok {
		log.Printf("🔍 Processing array format data for table %s with %d items", tableName, len(dataArray))
		for i, item := range dataArray {
			if itemMap, ok := item.(map[string]interface{}); ok {
				dataItems = append(dataItems, itemMap)
			} else {
				log.Printf("⚠️  Invalid item format at index %d for table %s", i, tableName)
			}
		}
	} else if dataMap, ok := tableData.(map[string]interface{}); ok {
		// Single object format (legacy)
		log.Printf("🔍 Processing single object format data for table %s", tableName)
		dataItems = append(dataItems, dataMap)
	} else {
		log.Printf("⚠️  Invalid data format for table %s (expected array or object)", tableName)
		return nil, nil
	}
	
	if len(dataItems) == 0 {
		log.Printf("⚠️  No valid data items found for table %s", tableName)
		return nil, nil
	}
	
	// For now, process only the first item (single row insertion)
	// TODO: Support multiple row insertion in the future
	dataMap := dataItems[0]
	if len(dataItems) > 1 {
		log.Printf("⚠️  Multiple rows detected for table %s, processing only the first row", tableName)
	}
	
	// Get all columns from schema, sorted for consistent ordering
	var allColumns []string
	for columnName := range tableSchema {
		allColumns = append(allColumns, columnName)
	}
	sort.Strings(allColumns)
	
	// Build columns and values arrays
	var columns []string
	var values []interface{}
	
	for _, columnName := range allColumns {
		// Check if data exists for this column
		if value, exists := dataMap[columnName]; exists {
			columns = append(columns, columnName)
			
			// Convert value based on column type
			convertedValue := amb.convertValueForColumn(tableName, columnName, value, tableSchema[columnName])
			values = append(values, convertedValue)
		}
	}
	
	// If no columns found, skip this table
	if len(columns) == 0 {
		log.Printf("⚠️  No matching columns found for table %s", tableName)
		return nil, nil
	}
	
	// Build the mutation
	mutation := amb.mutationBuilder.BuildInsertMutation(tableName, columns, values)
	return mutation, nil
}

// convertValueForColumn converts a value based on the column type
func (amb *AutoMutationBuilder) convertValueForColumn(tableName, columnName string, value interface{}, columnType string) interface{} {
	// Handle nil values
	if value == nil {
		return nil
	}
	
	// Handle time strings for timestamp columns
	if timeValue := amb.convertTimeValue(value, columnType, tableName, columnName); timeValue != nil {
		return timeValue
	}
	
	// Handle different data types
	return amb.convertByDataType(value, columnType)
}

// convertTimeValue handles time conversion for timestamp and int64 columns
func (amb *AutoMutationBuilder) convertTimeValue(value interface{}, columnType, tableName, columnName string) interface{} {
	if columnType != "TIMESTAMP" && columnType != "INT64" {
		return nil
	}
	
	timeStr, ok := value.(string)
	if !ok {
		return nil
	}
	
	if parsedTime, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return amb.mutationBuilder.ConvertTimeForColumn(parsedTime, tableName, columnName)
	}
	
	return nil
}

// convertByDataType converts value based on the specified data type
func (amb *AutoMutationBuilder) convertByDataType(value interface{}, columnType string) interface{} {
	switch {
	case columnType == "STRING":
		return amb.convertToString(value)
	case columnType == "INT64":
		return amb.convertToInt64(value)
	case columnType == "FLOAT64":
		return amb.convertToFloat64(value)
	case columnType == "BOOL":
		return amb.convertToBool(value)
	case columnType == "JSON":
		return amb.convertToJSON(value)
	case strings.HasPrefix(columnType, "ARRAY"):
		return amb.convertToArray(value)
	default:
		return value
	}
}

// convertToString converts value to string
func (amb *AutoMutationBuilder) convertToString(value interface{}) interface{} {
	if str, ok := value.(string); ok {
		return str
	}
	return value
}

// convertToInt64 converts value to int64
func (amb *AutoMutationBuilder) convertToInt64(value interface{}) interface{} {
	switch v := value.(type) {
	case float64:
		return int64(v)
	case int:
		return int64(v)
	case int64:
		return v
	default:
		return value
	}
}

// convertToFloat64 converts value to float64
func (amb *AutoMutationBuilder) convertToFloat64(value interface{}) interface{} {
	switch v := value.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return value
	}
}

// convertToBool converts value to bool
func (amb *AutoMutationBuilder) convertToBool(value interface{}) interface{} {
	if b, ok := value.(bool); ok {
		return b
	}
	return value
}

// convertToJSON converts value to JSON string
func (amb *AutoMutationBuilder) convertToJSON(value interface{}) interface{} {
	// Already a string
	if _, ok := value.(string); ok {
		return value
	}
	
	// Convert complex objects to JSON strings
	if jsonBytes, err := json.Marshal(value); err == nil {
		return string(jsonBytes)
	}
	
	return value
}

// convertToArray converts value to appropriate array type
func (amb *AutoMutationBuilder) convertToArray(value interface{}) interface{} {
	arr, ok := value.([]interface{})
	if !ok {
		// If it's already a proper array type, return as is
		return value
	}
	
	if len(arr) == 0 {
		// Return empty array of strings as default for empty arrays
		return []string{}
	}
	
	// Convert to appropriate array type based on first element
	switch arr[0].(type) {
	case string:
		return amb.convertToStringArray(arr)
	case float64, int, int64:
		return amb.convertToInt64Array(arr)
	default:
		// For unknown types, try to convert to string array
		return amb.convertToStringArray(arr)
	}
}

// convertToStringArray converts to string array
func (amb *AutoMutationBuilder) convertToStringArray(arr []interface{}) []string {
	var stringArray []string
	for _, item := range arr {
		if str, ok := item.(string); ok {
			stringArray = append(stringArray, str)
		} else {
			// Convert non-string items to string using fmt.Sprintf
			stringArray = append(stringArray, fmt.Sprintf("%v", item))
		}
	}
	return stringArray
}

// convertToInt64Array converts to int64 array
func (amb *AutoMutationBuilder) convertToInt64Array(arr []interface{}) []int64 {
	var int64Array []int64
	for _, item := range arr {
		switch v := item.(type) {
		case float64:
			int64Array = append(int64Array, int64(v))
		case int:
			int64Array = append(int64Array, int64(v))
		case int64:
			int64Array = append(int64Array, v)
		}
	}
	return int64Array
}