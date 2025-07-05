package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"PROJECT_NAME/internal/config"
	"PROJECT_NAME/internal/data"
	"PROJECT_NAME/internal/db"
)

func main() {
	// Load .env file and validate required environment variables
	if err := config.LoadEnvFile(); err != nil {
		log.Fatalf("Environment configuration error: %v", err)
	}

	if len(os.Args) < 2 {
		log.Fatal("Usage: go run main.go <database-id> [expected-config-path|--summary]")
	}

	databaseID := os.Args[1]

	// Validate database ID format to prevent injection attacks
	if err := config.ValidateDatabaseID(databaseID); err != nil {
		log.Fatalf("Invalid database ID: %v", err)
	}

	// Check if summary mode is requested
	if len(os.Args) == 2 || (len(os.Args) >= 3 && os.Args[2] == "--summary") {
		if err := printDatabaseSummary(databaseID); err != nil {
			log.Fatalf("❌ Summary failed: %v", err)
		}
		return
	}

	// Full validation mode
	configPath := os.Args[2]

	// Validate config file path
	if err := validateConfigFilePath(configPath); err != nil {
		log.Fatalf("Invalid config file path: %v", err)
	}

	log.Printf("🔍 Validating database: %s", databaseID)
	log.Printf("📋 Using config: %s", configPath)

	result, err := validateDatabase(databaseID, configPath)
	if err != nil {
		log.Fatalf("❌ Validation failed: %v", err)
	}

	outputHuman(result)
	
	// Display performance metrics if available
	if result.Performance != nil {
		fmt.Printf("\n%s\n", result.Performance.FormatMetrics())
	}

	if !result.Success {
		os.Exit(1)
	}
}

func printDatabaseSummary(databaseID string) error {
	ctx := context.Background()
	dbConfig, err := config.NewDatabaseConfig(databaseID)
	if err != nil {
		return fmt.Errorf("failed to create database config: %v", err)
	}

	// Create Spanner manager
	spannerManager, err := db.NewSpannerManager(ctx, dbConfig)
	if err != nil {
		return fmt.Errorf("failed to create Spanner manager: %v", err)
	}
	defer spannerManager.Close()

	// Print table summary using shared utility
	return db.PrintTableSummary(ctx, spannerManager.Client(), databaseID)
}

func validateDatabase(databaseID, configPath string) (*data.ValidationResult, error) {
	ctx := context.Background()
	dbConfig, err := config.NewDatabaseConfig(databaseID)
	if err != nil {
		return nil, fmt.Errorf("failed to create database config: %v", err)
	}

	// Read expected config
	var expectedConfig data.ExpectedConfig
	if err := data.ParseYAMLFile(configPath, &expectedConfig); err != nil {
		return nil, fmt.Errorf("failed to read/parse config file: %v", err)
	}

	// Create Spanner manager
	spannerManager, err := db.NewSpannerManager(ctx, dbConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Spanner manager: %v", err)
	}
	defer spannerManager.Close()

	// Use batch validator for optimal performance (reduces N+1 query problem)
	batchValidator := data.NewBatchValidator(spannerManager.Client())
	batchResult, err := batchValidator.ValidateTablesInBatch(ctx, expectedConfig)
	if err != nil {
		return nil, fmt.Errorf("batch validation failed: %w", err)
	}
	
	// Convert batch result to legacy format for compatibility
	result := &data.ValidationResult{
		DatabaseID:  databaseID,
		Success:     batchResult.Success,
		Results:     batchResult.Results,
		Errors:      batchResult.Errors,
		Performance: &batchResult.Performance,
	}

	return result, nil
}

func outputHuman(result *data.ValidationResult) {
	fmt.Printf("🔍 Database Validation Results: %s\n", result.DatabaseID)
	fmt.Printf("==================================\n\n")

	for tableName, tableResult := range result.Results {
		status := "✅"
		if !tableResult.Success {
			status = "❌"
		}

		fmt.Printf("%s Table: %s (rows: %d)\n", status, tableName, tableResult.RowCount)

		for _, message := range tableResult.Messages {
			fmt.Printf("  ℹ️  %s\n", message)
		}

		for _, error := range tableResult.Errors {
			fmt.Printf("  ❌ %s\n", error)
		}

		fmt.Println()
	}

	overallStatus := "✅ PASSED"
	if !result.Success {
		overallStatus = "❌ FAILED"
	}

	fmt.Printf("Overall Result: %s\n", overallStatus)

	if len(result.Errors) > 0 {
		fmt.Println("\nGlobal Errors:")
		for _, err := range result.Errors {
			fmt.Printf("  ❌ %s\n", err)
		}
	}
}

// validateConfigFilePath validates that a config file path is safe to read
func validateConfigFilePath(path string) error {
	if path == "" {
		return fmt.Errorf("config file path cannot be empty")
	}
	
	// Check for directory traversal attempts
	cleanPath := filepath.Clean(path)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("path traversal not allowed in config file path")
	}
	
	// Ensure file exists and is readable
	info, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("config file does not exist: %s", cleanPath)
		}
		return fmt.Errorf("cannot access config file: %v", err)
	}
	
	// Ensure it's a regular file, not a directory or special file
	if !info.Mode().IsRegular() {
		return fmt.Errorf("config file must be a regular file, not directory or special file")
	}
	
	// Check file extension (should be .yaml or .yml)
	lowerPath := strings.ToLower(cleanPath)
	if !strings.HasSuffix(lowerPath, ".yaml") && !strings.HasSuffix(lowerPath, ".yml") {
		return fmt.Errorf("config file must have .yaml or .yml extension")
	}
	
	// Check file size (prevent extremely large files)
	const maxFileSize = 10 * 1024 * 1024 // 10MB
	if info.Size() > maxFileSize {
		return fmt.Errorf("config file too large (max %d bytes, got %d bytes)", maxFileSize, info.Size())
	}
	
	return nil
}
