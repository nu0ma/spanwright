package main

import (
	"context"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"

	"cloud.google.com/go/spanner"
	"PROJECT_NAME/internal/config"
	"PROJECT_NAME/internal/db"
)

func main() {
	// Parse command-line flags for seed injection
	var databaseID = flag.String("database-id", "", "Database ID to inject seed data")
	var seedFile = flag.String("seed-file", "", "Path to SQL seed data file")
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

	// Read and execute SQL seed file
	log.Printf("Reading SQL seed data from: %s", *seedFile)
	sqlContent, err := ioutil.ReadFile(*seedFile)
	if err != nil {
		log.Fatalf("Failed to read SQL file: %v", err)
	}

	// Split SQL content into individual statements
	statements := splitSQLStatements(string(sqlContent))
	if len(statements) == 0 {
		log.Println("No SQL statements found in file")
		return
	}

	log.Printf("Executing %d SQL statements...", len(statements))

	// Execute each SQL statement
	for i, statement := range statements {
		statement = strings.TrimSpace(statement)
		if statement == "" {
			continue
		}

		log.Printf("Executing statement %d/%d...", i+1, len(statements))
		_, err := spannerManager.Client().ReadWriteTransaction(ctx, func(ctx context.Context, txn *spanner.ReadWriteTransaction) error {
			_, err := txn.Update(ctx, spanner.Statement{SQL: statement})
			return err
		})

		if err != nil {
			log.Fatalf("Failed to execute SQL statement %d: %v\nStatement: %s", i+1, err, statement)
		}
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
	
	// Check file extension (should be .sql)
	if !strings.HasSuffix(strings.ToLower(cleanPath), ".sql") {
		return fmt.Errorf("seed file must have .sql extension")
	}
	
	// Check file size (prevent extremely large files)
	const maxFileSize = 100 * 1024 * 1024 // 100MB
	if info.Size() > maxFileSize {
		return fmt.Errorf("seed file too large (max %d bytes, got %d bytes)", maxFileSize, info.Size())
	}
	
	return nil
}

// splitSQLStatements splits SQL content into individual statements
// Simple implementation that splits on semicolons, ignoring comments
func splitSQLStatements(content string) []string {
	var statements []string
	lines := strings.Split(content, "\n")
	var currentStatement strings.Builder

	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "--") {
			continue
		}

		currentStatement.WriteString(line)
		currentStatement.WriteString(" ")

		// If line ends with semicolon, we have a complete statement
		if strings.HasSuffix(line, ";") {
			stmt := strings.TrimSpace(currentStatement.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			currentStatement.Reset()
		}
	}

	// Handle any remaining statement without semicolon
	stmt := strings.TrimSpace(currentStatement.String())
	if stmt != "" {
		statements = append(statements, stmt)
	}

	return statements
}