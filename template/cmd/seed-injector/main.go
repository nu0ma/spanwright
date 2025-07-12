package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"PROJECT_NAME/internal/spanwright"
	"github.com/go-testfixtures/testfixtures/v3"
	_ "github.com/googleapis/go-sql-spanner"
)

func main() {
	// Parse command-line flags for seed injection
	var databaseID = flag.String("database-id", "", "Database ID to inject seed data")
	var fixtureDir = flag.String("fixture-dir", "", "Path to fixture directory containing YAML files")
	flag.Parse()

	if *databaseID == "" || *fixtureDir == "" {
		log.Fatal("Both --database-id and --fixture-dir are required")
	}

	// Validate database ID format to prevent injection attacks
	if err := validateDatabaseID(*databaseID); err != nil {
		log.Fatalf("Invalid database ID: %v", err)
	}

	// Validate fixture directory path to ensure it's safe to read
	if err := validateFixtureDir(*fixtureDir); err != nil {
		log.Fatalf("Invalid fixture directory path: %v", err)
	}

	// Load configuration
	config, err := spanwright.LoadConfig()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	// Execute seed injection with retry logic
	log.Printf("🌱 Injecting seed data using testfixtures...")
	log.Printf("📁 Fixture directory: %s", *fixtureDir)
	log.Printf("🎯 Target: %s/%s/%s", config.ProjectID, config.InstanceID, *databaseID)

	if err := injectSeedData(config.ProjectID, config.InstanceID, *databaseID, *fixtureDir); err != nil {
		log.Fatalf("Seed injection failed: %v", err)
	}

	log.Println("✅ Seed data injection completed successfully")
}

// injectSeedData performs the actual seed injection using testfixtures
func injectSeedData(projectID, instanceID, databaseID, fixtureDir string) error {
	ctx := context.Background()
	
	// Create secure database connection string for Spanner with validation
	dsn, err := spanwright.BuildSecureDSN(projectID, instanceID, databaseID)
	if err != nil {
		return fmt.Errorf("failed to build secure DSN: %v", err)
	}
	
	// Open database connection using Spanner SQL driver
	var db *sql.DB
	
	err = spanwright.WithRetry(ctx, "Open database connection", func(ctx context.Context, attempt int) error {
		var openErr error
		db, openErr = sql.Open("spanner", dsn)
		if openErr != nil {
			return openErr
		}
		
		// Test connection
		return db.PingContext(ctx)
	})
	
	if err != nil {
		return fmt.Errorf("failed to open database connection: %v", err)
	}
	defer db.Close()

	// Create testfixtures loader with retry logic
	var fixtures *testfixtures.Loader
	
	// Get available tables in the database
	availableTables, err := getAvailableTables(ctx, db)
	if err != nil {
		return fmt.Errorf("failed to get available tables: %v", err)
	}

	// Get fixture files that match available tables
	fixtureFiles, err := getFixtureFilesInOrder(fixtureDir, availableTables)
	if err != nil {
		return fmt.Errorf("failed to get fixture files: %v", err)
	}
	
	// If no fixture files found, skip seeding
	if len(fixtureFiles) == 0 {
		log.Printf("✅ No fixture files to process - database remains empty")
		return nil
	}

	err = spanwright.WithRetry(ctx, "Create testfixtures loader", func(ctx context.Context, attempt int) error {
		var loadErr error
		fixtures, loadErr = testfixtures.New(
			testfixtures.Database(db),
			testfixtures.Dialect("spanner"),
			testfixtures.Files(fixtureFiles...),
			testfixtures.DangerousSkipTestDatabaseCheck(),
		)
		return loadErr
	})
	
	if err != nil {
		return fmt.Errorf("failed to create testfixtures loader: %v", err)
	}

	// Load fixtures with retry logic
	err = spanwright.WithRetry(ctx, "Load fixtures", func(ctx context.Context, attempt int) error {
		return fixtures.Load()
	})
	
	if err != nil {
		return fmt.Errorf("failed to load fixtures: %v", err)
	}

	return nil
}

// getAvailableTables gets the list of tables available in the database with security validation
func getAvailableTables(ctx context.Context, db *sql.DB) (map[string]bool, error) {
	// Use parameterized query to prevent SQL injection
	rows, err := db.QueryContext(ctx, "SELECT table_name FROM information_schema.tables WHERE table_schema = '' ORDER BY table_name")
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %v", err)
	}
	defer rows.Close()

	availableTables := make(map[string]bool)
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("failed to scan table name: %v", err)
		}
		
		// Validate table name for security before adding to map
		if err := spanwright.ValidateTableName(tableName); err != nil {
			log.Printf("Warning: Skipping invalid table name '%s': %v", tableName, err)
			continue
		}
		
		availableTables[tableName] = true
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over tables: %v", err)
	}

	return availableTables, nil
}

// getFixtureFilesInOrder returns fixture files in the correct order for Spanner
// considering foreign key dependencies and interleaved table constraints
// Only returns files for tables that exist in the database
func getFixtureFilesInOrder(fixtureDir string, availableTables map[string]bool) ([]string, error) {
	entries, err := os.ReadDir(fixtureDir)
	if err != nil {
		return nil, fmt.Errorf("cannot read fixture directory: %v", err)
	}
	
	var fixtureFiles []string
	
	// No predefined table order - let users define their own fixture loading order
	// Files will be processed in alphabetical order by filename
	// Users can use numeric prefixes (001_, 002_, etc.) to control loading order
	
	// Collect YAML/YML files for tables that exist in the database
	var yamlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() {
			name := entry.Name()
			if strings.HasSuffix(strings.ToLower(name), ".yml") || strings.HasSuffix(strings.ToLower(name), ".yaml") {
				tableName := getTableNameFromFile(name)
				
				// Validate table name for security
				if err := spanwright.ValidateTableName(tableName); err != nil {
					log.Printf("⚠️ Skipping fixture with invalid table name '%s': %v", tableName, err)
					continue
				}
				
				if availableTables[tableName] {
					yamlFiles = append(yamlFiles, name)
					log.Printf("📄 Found fixture for table: %s", tableName)
				} else {
					log.Printf("⚠️ Skipping fixture for non-existent table: %s", tableName)
				}
			}
		}
	}
	
	// Sort files alphabetically by filename
	// Users can control loading order using filename prefixes (001_, 002_, etc.)
	sort.Strings(yamlFiles)
	
	// Convert to full paths
	for _, file := range yamlFiles {
		fixtureFiles = append(fixtureFiles, filepath.Join(fixtureDir, file))
	}
	
	if len(fixtureFiles) == 0 {
		log.Printf("⚠️ No YAML fixture files found in directory: %s", fixtureDir)
		log.Printf("💡 Database will remain empty - add .yml or .yaml files to seed data")
		return []string{}, nil // Return empty slice instead of error
	}
	
	return fixtureFiles, nil
}

// getTableNameFromFile extracts the table name from a fixture file name
func getTableNameFromFile(filename string) string {
	// Remove extension
	name := filename
	if strings.HasSuffix(strings.ToLower(name), ".yml") {
		name = name[:len(name)-4]
	} else if strings.HasSuffix(strings.ToLower(name), ".yaml") {
		name = name[:len(name)-5]
	}
	
	// Return the exact name (should match table name exactly)
	return name
}

// validateFixtureDir validates that a fixture directory path is safe to read
func validateFixtureDir(path string) error {
	if path == "" {
		return fmt.Errorf("fixture directory path cannot be empty")
	}
	
	// Check for directory traversal attempts
	cleanPath := filepath.Clean(path)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("path traversal not allowed in fixture directory path")
	}
	
	// Ensure directory exists and is readable
	info, err := os.Stat(cleanPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("fixture directory does not exist: %s", cleanPath)
		}
		return fmt.Errorf("cannot access fixture directory: %v", err)
	}
	
	// Ensure it's a directory
	if !info.IsDir() {
		return fmt.Errorf("fixture path must be a directory, not a file")
	}
	
	// Check if directory contains YAML files
	entries, err := os.ReadDir(cleanPath)
	if err != nil {
		return fmt.Errorf("cannot read fixture directory: %v", err)
	}
	
	hasYAMLFiles := false
	for _, entry := range entries {
		if !entry.IsDir() && (strings.HasSuffix(strings.ToLower(entry.Name()), ".yml") || strings.HasSuffix(strings.ToLower(entry.Name()), ".yaml")) {
			hasYAMLFiles = true
			break
		}
	}
	
	if !hasYAMLFiles {
		log.Printf("⚠️ No YAML fixture files found in directory - database will be empty")
		log.Printf("💡 Add .yml or .yaml files to %s to seed your database", cleanPath)
	}
	
	return nil
}

// validateDatabaseID validates that a database ID is safe using enhanced security validation
func validateDatabaseID(databaseID string) error {
	// Use the enhanced validation from spanwright package
	return spanwright.ValidateDatabaseID(databaseID)
}