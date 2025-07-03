package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"temp-validation/internal/config"
	"temp-validation/internal/data"
	"temp-validation/internal/db"
)

func main() {
	// Parse command-line flags for seed injection
	var databaseID = flag.String("database-id", "", "Database ID to inject seed data")
	var seedFile = flag.String("seed-file", "", "Path to seed data file")
	flag.Parse()

	if *databaseID == "" || *seedFile == "" {
		log.Fatal("Both --database-id and --seed-file are required")
	}

	// Validate database ID format to prevent injection attacks
	if err := config.ValidateDatabaseID(*databaseID); err != nil {
		log.Fatalf("Invalid database ID: %v", err)
	}

	// Validate seed file path to ensure it's safe to read
	if err := validateSeedFilePath(*seedFile); err != nil {
		log.Fatalf("Invalid seed file path: %v", err)
	}

	// Load .env file and validate required environment variables
	if err := config.LoadEnvFile(); err != nil {
		log.Fatalf("Environment configuration error: %v", err)
	}

	ctx := context.Background()
	dbConfig, err := config.NewDatabaseConfig(*databaseID)
	if err != nil {
		log.Fatalf("Failed to create database config: %v", err)
	}

	// Create pooled Spanner manager for better performance
	spannerManager, err := db.NewPooledSpannerManager(ctx, dbConfig)
	if err != nil {
		log.Fatalf("Failed to create pooled Spanner manager: %v", err)
	}
	defer spannerManager.Close()
	
	// Print pool statistics
	stats := spannerManager.GetPoolStats()
	log.Printf("📊 Connection Pool: %d/%d active, %d idle", 
		stats.ActiveConnections, stats.MaxConnections, stats.IdleConnections)

	// List all tables to get schema information
	log.Println("Getting table schema information...")
	tables, err := db.ListTables(ctx, spannerManager.Client())
	if err != nil {
		log.Fatalf("Failed to list tables: %v", err)
	}

	if len(tables) == 0 {
		log.Fatal("No tables found. Please apply schema first using 'make schema'")
	}

	log.Printf("Found %d tables in database", len(tables))

	// Get schema path from environment variable
	schemaPath := os.Getenv("SCHEMA_PATH")
	if schemaPath == "" {
		log.Fatal("SCHEMA_PATH environment variable is required for schema parsing")
	}

	// Read DDL files from schema path
	log.Printf("Reading schema files from: %s", schemaPath)
	ddlStatements, err := db.ReadSchemaFiles(schemaPath)
	if err != nil {
		log.Fatalf("Failed to read schema files from %s: %v", schemaPath, err)
	}

	// Parse schema information from DDL statements using existing function
	schemaMap := db.ParseSchemaFromDDL(ddlStatements)

	// Create seed data processor
	processor := data.NewSeedDataProcessor(schemaMap)

	// Process seed data
	log.Printf("Processing seed data from: %s", *seedFile)
	if err := processor.ProcessSeedData(ctx, spannerManager.Client(), *seedFile, tables); err != nil {
		log.Fatalf("Failed to process seed data: %v", err)
	}

	log.Println("✅ Seed data injection completed successfully")
}

// validateSeedFilePath validates that a seed file path is safe to read
func validateSeedFilePath(path string) error {
	if path == "" {
		return fmt.Errorf("seed file path cannot be empty")
	}
	
	// Check for directory traversal attempts
	cleanPath := filepath.Clean(path)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("path traversal not allowed in seed file path")
	}
	
	// Ensure file exists and is readable
	info, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("seed file does not exist: %s", cleanPath)
		}
		return fmt.Errorf("cannot access seed file: %v", err)
	}
	
	// Ensure it's a regular file, not a directory or special file
	if !info.Mode().IsRegular() {
		return fmt.Errorf("seed file must be a regular file, not directory or special file")
	}
	
	// Check file extension (should be .json)
	if !strings.HasSuffix(strings.ToLower(cleanPath), ".json") {
		return fmt.Errorf("seed file must have .json extension")
	}
	
	// Check file size (prevent extremely large files)
	const maxFileSize = 100 * 1024 * 1024 // 100MB
	if info.Size() > maxFileSize {
		return fmt.Errorf("seed file too large (max %d bytes, got %d bytes)", maxFileSize, info.Size())
	}
	
	return nil
}