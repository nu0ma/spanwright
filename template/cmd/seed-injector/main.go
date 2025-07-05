package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"PROJECT_NAME/internal/config"
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

	// Get environment variables for spemu
	projectID := os.Getenv("PROJECT_ID")
	instanceID := os.Getenv("INSTANCE_ID")
	
	if projectID == "" || instanceID == "" {
		log.Fatal("PROJECT_ID and INSTANCE_ID environment variables are required")
	}

	// Execute spemu command
	log.Printf("🌱 Injecting seed data using spemu...")
	log.Printf("📁 Seed file: %s", *seedFile)
	log.Printf("🎯 Target: %s/%s/%s", projectID, instanceID, *databaseID)

	cmd := exec.Command("spemu",
		"--project="+projectID,
		"--instance="+instanceID,
		"--database="+*databaseID,
		"--port=9010",
		*seedFile,
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatalf("spemu execution failed: %v", err)
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