package main

import (
	"log"
	"hogehoge/internal/db"
)

// cleanup-pools.go - Utility script to cleanup database connection pools
// This is called during test teardown to ensure proper resource cleanup

func main() {
	log.Println("🔌 Cleaning up global database connection pool...")
	
	if err := db.CloseGlobalPool(); err != nil {
		log.Printf("⚠️ Warning during pool cleanup: %v", err)
	} else {
		log.Println("✅ Global connection pool cleaned up successfully")
	}
}