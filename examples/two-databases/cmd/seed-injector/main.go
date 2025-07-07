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

	"two-databases/internal/config"
	"two-databases/internal/retry"
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
	if err := config.ValidateDatabaseID(*databaseID); err != nil {
		log.Fatalf("Invalid database ID: %v", err)
	}

	// Validate fixture directory path to ensure it's safe to read
	if err := validateFixtureDir(*fixtureDir); err != nil {
		log.Fatalf("Invalid fixture directory path: %v", err)
	}

	// Load .env file and validate required environment variables
	if err := config.LoadEnvFile(); err != nil {
		log.Fatalf("Environment configuration error: %v", err)
	}

	// Get environment variables
	projectID := os.Getenv("PROJECT_ID")
	instanceID := os.Getenv("INSTANCE_ID")
	
	if projectID == "" || instanceID == "" {
		log.Fatal("PROJECT_ID and INSTANCE_ID environment variables are required")
	}

	// Execute seed injection with retry logic
	log.Printf("🌱 Injecting seed data using testfixtures...")
	log.Printf("📁 Fixture directory: %s", *fixtureDir)
	log.Printf("🎯 Target: %s/%s/%s", projectID, instanceID, *databaseID)

	if err := injectSeedData(projectID, instanceID, *databaseID, *fixtureDir); err != nil {
		log.Fatalf("Seed injection failed: %v", err)
	}

	log.Println("✅ Seed data injection completed successfully")
}

// injectSeedData performs the actual seed injection using testfixtures
func injectSeedData(projectID, instanceID, databaseID, fixtureDir string) error {
	ctx := context.Background()
	
	// Create database connection string for Spanner
	dsn := fmt.Sprintf("projects/%s/instances/%s/databases/%s", projectID, instanceID, databaseID)
	
	// Open database connection using Spanner SQL driver
	var db *sql.DB
	var err error
	
	err = retry.DatabaseOperation(ctx, "Open database connection", func(ctx context.Context, attempt int) error {
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

	err = retry.DatabaseOperation(ctx, "Create testfixtures loader", func(ctx context.Context, attempt int) error {
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
	err = retry.DatabaseOperation(ctx, "Load fixtures", func(ctx context.Context, attempt int) error {
		return fixtures.Load()
	})
	
	if err != nil {
		return fmt.Errorf("failed to load fixtures: %v", err)
	}

	return nil
}

// getAvailableTables gets the list of tables available in the database
func getAvailableTables(ctx context.Context, db *sql.DB) (map[string]bool, error) {
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
	
	// Define dependency order for common table patterns
	// Parent tables should come before child tables
	preferredOrder := []string{
		"Users", "Products", "Orders", "OrderItems",
		"Analytics", "UserLogs",
	}
	
	// Create a map for quick lookup
	orderMap := make(map[string]int)
	for i, name := range preferredOrder {
		orderMap[name] = i
	}
	
	// Collect YAML/YML files for tables that exist in the database
	var yamlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() {
			name := entry.Name()
			if strings.HasSuffix(strings.ToLower(name), ".yml") || strings.HasSuffix(strings.ToLower(name), ".yaml") {
				tableName := getTableNameFromFile(name)
				if availableTables[tableName] {
					yamlFiles = append(yamlFiles, name)
					log.Printf("📄 Found fixture for table: %s", tableName)
				} else {
					log.Printf("⚠️ Skipping fixture for non-existent table: %s", tableName)
				}
			}
		}
	}
	
	// Sort files based on dependency order
	sort.Slice(yamlFiles, func(i, j int) bool {
		nameI := getTableNameFromFile(yamlFiles[i])
		nameJ := getTableNameFromFile(yamlFiles[j])
		
		orderI, existsI := orderMap[nameI]
		orderJ, existsJ := orderMap[nameJ]
		
		if existsI && existsJ {
			return orderI < orderJ
		} else if existsI {
			return true
		} else if existsJ {
			return false
		}
		
		// If neither is in the preferred order, sort alphabetically
		return strings.Compare(nameI, nameJ) < 0
	})
	
	// Convert to full paths
	for _, file := range yamlFiles {
		fixtureFiles = append(fixtureFiles, filepath.Join(fixtureDir, file))
	}
	
	if len(fixtureFiles) == 0 {
		return nil, fmt.Errorf("no YAML fixture files found in directory: %s", fixtureDir)
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
		return fmt.Errorf("fixture directory must contain at least one YAML file (.yml or .yaml)")
	}
	
	return nil
}