package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)


// ReadSchemaFiles reads and parses DDL files from a directory or single file
func ReadSchemaFiles(schemaPath string) ([]string, error) {
	fileInfo, err := os.Stat(schemaPath)
	if err != nil {
		return nil, err
	}

	var ddlStatements []string

	if fileInfo.IsDir() {
		ddlStatements, err = readSchemaDirectory(schemaPath)
	} else {
		ddlStatements, err = readSchemaFile(schemaPath)
	}

	if err != nil {
		return nil, err
	}

	if len(ddlStatements) == 0 {
		log.Printf("Warning: No DDL statements found in %s", schemaPath)
	} else {
		log.Printf("Loaded %d DDL statements", len(ddlStatements))
	}

	return ddlStatements, nil
}

func readSchemaDirectory(schemaPath string) ([]string, error) {
	files, err := os.ReadDir(schemaPath)
	if err != nil {
		return nil, err
	}

	// Look for migration files (starting with numbers) first
	var migrationFiles []string
	var hasSchemaFile bool
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			// Prioritize files starting with numbers (migration files)
			if len(file.Name()) > 0 && (file.Name()[0] >= '0' && file.Name()[0] <= '9') {
				migrationFiles = append(migrationFiles, file.Name())
			} else if file.Name() == "schema.sql" {
				hasSchemaFile = true
			}
		}
	}

	var ddlStatements []string

	if len(migrationFiles) > 0 {
		// Migration files found
		sort.Strings(migrationFiles)
		log.Printf("Found %d migration files in directory %s", len(migrationFiles), schemaPath)

		for _, filename := range migrationFiles {
			log.Printf("Reading migration file: %s", filename)
			fullPath := filepath.Join(schemaPath, filename)
			content, err := os.ReadFile(fullPath)
			if err != nil {
				return nil, err
			}

			if strings.TrimSpace(string(content)) != "" {
				statements := SplitSQLStatements(string(content))
				ddlStatements = append(ddlStatements, statements...)
			}
		}
	} else if hasSchemaFile {
		// Fall back to schema.sql
		log.Printf("No migration files found, reading schema.sql from directory %s", schemaPath)
		schemaFilePath := filepath.Join(schemaPath, "schema.sql")
		content, err := os.ReadFile(schemaFilePath)
		if err != nil {
			return nil, err
		}

		if strings.TrimSpace(string(content)) != "" {
			statements := SplitSQLStatements(string(content))
			ddlStatements = append(ddlStatements, statements...)
		}
	} else {
		return nil, fmt.Errorf("no migration files (000*.sql) or schema.sql found in directory %s", schemaPath)
	}

	return ddlStatements, nil
}

func readSchemaFile(schemaPath string) ([]string, error) {
	log.Printf("Reading single schema file: %s", schemaPath)
	content, err := os.ReadFile(schemaPath)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(string(content)) == "" {
		return []string{}, nil
	}

	return SplitSQLStatements(string(content)), nil
}

// SplitSQLStatements splits a SQL file content into individual statements
func SplitSQLStatements(content string) []string {
	var statements []string

	// Split by semicolon
	parts := strings.Split(content, ";")

	for _, part := range parts {
		// Remove whitespace and comments
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		// Remove comment lines
		lines := strings.Split(trimmed, "\n")
		var validLines []string
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && !strings.HasPrefix(line, "--") && !strings.HasPrefix(line, "/*") {
				validLines = append(validLines, line)
			}
		}

		if len(validLines) > 0 {
			statement := strings.Join(validLines, "\n")
			if statement != "" {
				statements = append(statements, statement)
			}
		}
	}

	return statements
}

// ParseSchemaFromDDL extracts table schema information from DDL statements
func ParseSchemaFromDDL(ddlStatements []string) map[string]map[string]string {
	schemaMap := make(map[string]map[string]string)

	for _, ddl := range ddlStatements {
		processStatement(ddl, schemaMap)
	}


	log.Printf("📊 Parsed schema for %d tables", len(schemaMap))
	return schemaMap
}

// processStatement processes a single DDL statement and updates the schema map
func processStatement(ddl string, schemaMap map[string]map[string]string) {
	upperDDL := strings.ToUpper(ddl)
	
	if strings.Contains(upperDDL, "CREATE TABLE") {
		processCreateTable(ddl, schemaMap)
	} else if strings.Contains(upperDDL, "ALTER TABLE") && strings.Contains(upperDDL, "ADD COLUMN") {
		processAlterTableAddColumn(ddl, schemaMap)
	}
}

// processCreateTable handles CREATE TABLE statements
func processCreateTable(ddl string, schemaMap map[string]map[string]string) {
	tableName := extractTableName(ddl)
	if tableName == "" {
		return
	}

	columns := extractColumnTypes(ddl)
	if len(columns) > 0 {
		schemaMap[tableName] = columns
		log.Printf("📋 Parsed schema for %s: %v", tableName, columns)
	}
}

// processAlterTableAddColumn handles ALTER TABLE ADD COLUMN statements
func processAlterTableAddColumn(ddl string, schemaMap map[string]map[string]string) {
	tableName := extractAlterTableName(ddl)
	if tableName == "" {
		return
	}
	
	columnName, columnType := extractAlterColumnInfo(ddl)
	if columnName != "" && columnType != "" {
		// Initialize table schema if it doesn't exist
		if schemaMap[tableName] == nil {
			schemaMap[tableName] = make(map[string]string)
		}
		
		// Add the new column
		schemaMap[tableName][columnName] = columnType
		log.Printf("📋 Added column %s.%s: %s via ALTER", tableName, columnName, columnType)
	}
}


// extractTableName extracts table name from CREATE TABLE statement
func extractTableName(ddl string) string {
	lines := strings.Split(ddl, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(strings.ToUpper(line), "CREATE TABLE") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				return strings.Trim(parts[2], " (")
			}
		}
	}
	return ""
}

// extractColumnTypes extracts ALL column information from DDL
func extractColumnTypes(ddl string) map[string]string {
	columns := make(map[string]string)

	lines := strings.Split(ddl, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		upperLine := strings.ToUpper(line)

		// Skip CREATE TABLE and PRIMARY KEY lines
		if strings.HasPrefix(upperLine, "CREATE TABLE") || 
		   strings.HasPrefix(upperLine, "PRIMARY KEY") ||
		   strings.HasPrefix(upperLine, ")") ||
		   strings.HasPrefix(upperLine, "CREATE INDEX") ||
		   strings.HasPrefix(upperLine, "ALTER TABLE") ||
		   line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		// Extract column name and type from column definition lines
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			columnName := strings.TrimSuffix(parts[0], ",")
			columnType := extractBaseType(parts[1])

			// Store all column types for complete schema information
			columns[columnName] = columnType
		}
	}

	return columns
}

// extractBaseType extracts the base type from column definition
func extractBaseType(typeStr string) string {
	typeStr = strings.ToUpper(typeStr)
	typeStr = strings.TrimSuffix(typeStr, ",")
	
	// Handle types with parameters like STRING(256), ARRAY<STRING(MAX)>
	if strings.Contains(typeStr, "(") {
		return strings.Split(typeStr, "(")[0]
	}
	if strings.Contains(typeStr, "<") {
		return strings.Split(typeStr, "<")[0]
	}
	
	return typeStr
}

// extractAlterTableName extracts table name from ALTER TABLE statement
func extractAlterTableName(ddl string) string {
	lines := strings.Split(ddl, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		upperLine := strings.ToUpper(line)
		if strings.HasPrefix(upperLine, "ALTER TABLE") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				return parts[2]
			}
		}
	}
	return ""
}

// extractAlterColumnInfo extracts column name and type from ALTER TABLE ADD COLUMN statement
func extractAlterColumnInfo(ddl string) (string, string) {
	lines := strings.Split(ddl, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		upperLine := strings.ToUpper(line)
		if strings.Contains(upperLine, "ADD COLUMN") {
			// Find "ADD COLUMN" and extract the column definition after it
			addIndex := strings.Index(upperLine, "ADD COLUMN")
			if addIndex != -1 {
				columnDef := strings.TrimSpace(line[addIndex+len("ADD COLUMN"):])
				// Remove trailing semicolon if present
				columnDef = strings.TrimSuffix(columnDef, ";")
				
				parts := strings.Fields(columnDef)
				if len(parts) >= 2 {
					columnName := parts[0]
					columnType := extractBaseType(parts[1])
					return columnName, columnType
				}
			}
		}
	}
	return "", ""
}

// ConvertTableName converts seed data table names to schema table names
// Examples: "company" -> "Company", "realtor_vendor_setting" -> "RealtorVendorSetting"
func ConvertTableName(seedName string, availableTables []string) string {
	// First try exact match (for already correct names)
	for _, tableName := range availableTables {
		if tableName == seedName {
			return tableName
		}
	}
	
	// Try case-insensitive match
	for _, tableName := range availableTables {
		if strings.EqualFold(tableName, seedName) {
			return tableName
		}
	}
	
	// Convert snake_case to PascalCase
	pascalCase := SnakeToPascalCase(seedName)
	for _, tableName := range availableTables {
		if tableName == pascalCase {
			return tableName
		}
	}
	
	// Try case-insensitive PascalCase match
	for _, tableName := range availableTables {
		if strings.EqualFold(tableName, pascalCase) {
			return tableName
		}
	}
	
	// If no match found, return original name for error handling
	return seedName
}

// SnakeToPascalCase converts snake_case to PascalCase
// Example: "realtor_vendor_setting" -> "RealtorVendorSetting"
func SnakeToPascalCase(s string) string {
	if s == "" {
		return s
	}
	
	parts := strings.Split(s, "_")
	var result strings.Builder
	
	for _, part := range parts {
		if len(part) > 0 {
			// Capitalize first letter and add the rest
			result.WriteString(strings.ToUpper(string(part[0])))
			if len(part) > 1 {
				result.WriteString(strings.ToLower(part[1:]))
			}
		}
	}
	
	return result.String()
}

// ValidateTableName checks if table name exists in schema
func ValidateTableName(tableName string, availableTables []string) bool {
	for _, availableTable := range availableTables {
		if availableTable == tableName {
			return true
		}
	}
	return false
}
