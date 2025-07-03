package db

import (
	"context"
	"fmt"
	"log"
	"sort"

	"cloud.google.com/go/spanner"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"hogehoge/internal/retry"
)

// ListTables returns all table names in the database with retry logic
func ListTables(ctx context.Context, client *spanner.Client) ([]string, error) {
	var tables []string
	
	err := retry.DatabaseOperation(ctx, "List Tables", func(ctx context.Context, attempt int) error {
		tables = nil // Reset on retry
		
		stmt := spanner.NewStatement("SELECT table_name FROM information_schema.tables WHERE table_schema = '' ORDER BY table_name")
		iter := client.Single().Query(ctx, stmt)
		defer iter.Stop()

		for {
			row, err := iter.Next()
			if err != nil {
				if err == iterator.Done {
					break
				}
				return fmt.Errorf("error listing tables: %v", err)
			}

			var tableName string
			if err := row.Columns(&tableName); err != nil {
				log.Printf("Error reading table name: %v", err)
				continue
			}
			tables = append(tables, tableName)
		}
		
		return nil
	})
	
	if err != nil {
		return nil, err
	}

	sort.Strings(tables)
	return tables, nil
}

// GetTableRowCount returns the number of rows in a table with retry logic
func GetTableRowCount(ctx context.Context, client *spanner.Client, tableName string) (int64, error) {
	// Validate table name to prevent SQL injection
	if err := validateTableName(tableName); err != nil {
		return 0, fmt.Errorf("invalid table name: %v", err)
	}
	
	var count int64
	err := retry.DatabaseOperation(ctx, fmt.Sprintf("Count rows in table %s", tableName), func(ctx context.Context, attempt int) error {
		stmt := spanner.NewStatement(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", escapeIdentifier(tableName)))
		iter := client.Single().Query(ctx, stmt)
		defer iter.Stop()

		row, err := iter.Next()
		if err != nil {
			return fmt.Errorf("failed to execute COUNT query for table %s: %w", tableName, err)
		}

		if err := row.Columns(&count); err != nil {
			return fmt.Errorf("failed to read count result for table %s: %w", tableName, err)
		}
		
		return nil
	})

	return count, err
}

// PrintTableSummary prints a summary of all tables and their row counts
func PrintTableSummary(ctx context.Context, client *spanner.Client, databaseID string) error {
	fmt.Printf("🔍 Checking data in database: %s\n", databaseID)
	fmt.Printf("==================================\n\n")

	tables, err := ListTables(ctx, client)
	if err != nil {
		return fmt.Errorf("failed to list tables: %v", err)
	}

	if len(tables) == 0 {
		fmt.Printf("⚠️  No tables found in database %s\n", databaseID)
		return nil
	}

	fmt.Printf("📊 Found %d tables:\n\n", len(tables))

	totalRows := int64(0)
	for _, tableName := range tables {
		count, err := GetTableRowCount(ctx, client, tableName)
		if err != nil {
			fmt.Printf("❌ %-30s ERROR: %v\n", tableName, err)
			continue
		}

		status := "✅"
		if count == 0 {
			status = "⚠️"
		}

		fmt.Printf("%s %-30s %d rows\n", status, tableName, count)
		totalRows += count
	}

	fmt.Printf("\n==================================\n")
	fmt.Printf("📈 Total rows across all tables: %d\n", totalRows)

	if totalRows == 0 {
		fmt.Printf("⚠️  Database appears to be empty\n")
	} else {
		fmt.Printf("✅ Database contains data\n")
	}

	return nil
}

// ApplyMutations applies a list of mutations to the database with retry logic
func ApplyMutations(ctx context.Context, client *spanner.Client, mutations []*spanner.Mutation) error {
	if len(mutations) == 0 {
		log.Printf("⚠️  No mutations to apply")
		return nil
	}

	log.Printf("🚀 Applying %d mutations to database...", len(mutations))
	
	err := retry.DatabaseOperation(ctx, "Apply mutations", func(ctx context.Context, attempt int) error {
		if attempt > 1 {
			log.Printf("🔄 Retry attempt %d for applying %d mutations", attempt, len(mutations))
		}
		
		_, err := client.Apply(ctx, mutations)
		if err != nil {
			// Handle already exists error gracefully
			if spanner.ErrCode(err) == codes.AlreadyExists {
				log.Printf("⚠️  Some data already exists (AlreadyExists error), continuing. Details: %v", err)
				return nil
			}
			// Return error for retry logic to handle
			return fmt.Errorf("failed to apply %d mutations to database: %w", len(mutations), err)
		}
		
		return nil
	})
	
	if err != nil {
		return err
	}

	log.Printf("✅ Successfully applied mutations")
	return nil
}
