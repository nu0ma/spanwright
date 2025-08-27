package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"PROJECT_NAME/internal/spanwright"
	"github.com/go-testfixtures/testfixtures/v3"
	_ "github.com/googleapis/go-sql-spanner"
)

func main() {
	// Parse command-line flags
	var databaseID = flag.String("database-id", "", "Database ID to inject seed data")
	var fixtureDir = flag.String("fixture-dir", "", "Path to fixture directory containing YAML files")
	flag.Parse()

	if *databaseID == "" || *fixtureDir == "" {
		log.Fatal("Both --database-id and --fixture-dir are required")
	}

	// Load configuration
	config, err := spanwright.LoadConfig()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	// Execute seed injection
	log.Printf("Injecting seed data into %s/%s/%s", config.ProjectID, config.InstanceID, *databaseID)
	log.Printf("Loading fixtures from: %s", *fixtureDir)

	if err := injectSeedData(config.ProjectID, config.InstanceID, *databaseID, *fixtureDir); err != nil {
		log.Fatalf("Seed injection failed: %v", err)
	}

	log.Println("✅ Seed data injection completed successfully")
}

func injectSeedData(projectID, instanceID, databaseID, fixtureDir string) error {
	ctx := context.Background()
	
	// Build database connection string
	dsn, err := spanwright.BuildDSN(projectID, instanceID, databaseID)
	if err != nil {
		return fmt.Errorf("failed to build DSN: %v", err)
	}
	
	// Open database connection
	db, err := sql.Open("spanner", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	// Get fixture files
	fixtureFiles, err := getFixtureFiles(fixtureDir)
	if err != nil {
		return fmt.Errorf("failed to get fixture files: %v", err)
	}

	if len(fixtureFiles) == 0 {
		return fmt.Errorf("no fixture files found in %s", fixtureDir)
	}

	// Create testfixtures loader
	fixtures, err := testfixtures.New(
		testfixtures.Database(db),
		testfixtures.Dialect("spanner"),
		testfixtures.Files(fixtureFiles...),
		testfixtures.DangerousSkipTestDatabaseCheck(),
	)
	if err != nil {
		return fmt.Errorf("failed to create fixtures loader: %v", err)
	}

	// Load fixtures
	if err := fixtures.Load(); err != nil {
		return fmt.Errorf("failed to load fixtures: %v", err)
	}

	return nil
}

func getFixtureFiles(fixtureDir string) ([]string, error) {
	// Check directory exists
	if _, err := os.Stat(fixtureDir); err != nil {
		return nil, fmt.Errorf("fixture directory not accessible: %v", err)
	}

	// Find all YAML files
	var fixtureFiles []string
	
	patterns := []string{"*.yml", "*.yaml"}
	for _, pattern := range patterns {
		files, err := filepath.Glob(filepath.Join(fixtureDir, pattern))
		if err != nil {
			return nil, fmt.Errorf("failed to list files: %v", err)
		}
		fixtureFiles = append(fixtureFiles, files...)
	}

	return fixtureFiles, nil
}