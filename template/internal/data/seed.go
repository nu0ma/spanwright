package data

import (
	"context"
	"log"

	"cloud.google.com/go/spanner"

	"PROJECT_NAME/internal/db"
)

// SeedDataProcessor handles processing and inserting seed data
type SeedDataProcessor struct {
	mutationBuilder *db.MutationBuilder
}

// NewSeedDataProcessor creates a new SeedDataProcessor
func NewSeedDataProcessor(schemaMap map[string]map[string]string) *SeedDataProcessor {
	return &SeedDataProcessor{
		mutationBuilder: db.NewMutationBuilder(schemaMap),
	}
}

// ProcessSeedData processes seed data and returns mutations
func (sdp *SeedDataProcessor) ProcessSeedData(ctx context.Context, client *spanner.Client, seedFilePath string, availableTables []string) error {
	log.Printf("Reading seed data from: %s", seedFilePath)

	seedData, err := ParseJSONFile(seedFilePath)
	if err != nil {
		log.Printf("⚠️  Seed file not found or invalid: %s, skipping seed data insertion", seedFilePath)
		return nil
	}

	format := DetectSeedDataFormat(seedData)
	log.Printf("Detected %s format seed data", format.String())

	switch format {
	case FormatOrganization:
		return sdp.insertOrganizationData(ctx, client, seedData, availableTables)
	case FormatCompany:
		return sdp.insertCompanyData(ctx, client, seedData, availableTables)
	default:
		log.Printf("⚠️  Unknown seed data format")
		return nil
	}
}

func (sdp *SeedDataProcessor) insertOrganizationData(ctx context.Context, client *spanner.Client, seedData map[string]interface{}, availableTables []string) error {
	// Use AutoMutationBuilder for automatic schema-based insertion
	autoBuilder := db.NewAutoMutationBuilder(sdp.mutationBuilder.SchemaMap, availableTables)
	
	mutations, err := autoBuilder.BuildMutationsFromSeedData(seedData)
	if err != nil {
		log.Printf("❌ Failed to build mutations: %v", err)
		return err
	}
	
	if len(mutations) == 0 {
		log.Printf("⚠️  No mutations generated from seed data")
		return nil
	}
	
	return db.ApplyMutations(ctx, client, mutations)
}

func (sdp *SeedDataProcessor) insertCompanyData(ctx context.Context, client *spanner.Client, seedData map[string]interface{}, availableTables []string) error {
	// Use AutoMutationBuilder for automatic schema-based insertion
	autoBuilder := db.NewAutoMutationBuilder(sdp.mutationBuilder.SchemaMap, availableTables)
	
	mutations, err := autoBuilder.BuildMutationsFromSeedData(seedData)
	if err != nil {
		log.Printf("❌ Failed to build mutations: %v", err)
		return err
	}
	
	if len(mutations) == 0 {
		log.Printf("⚠️  No mutations generated from seed data")
		return nil
	}
	
	return db.ApplyMutations(ctx, client, mutations)
}


func (sdp *SeedDataProcessor) tableExists(tableName string, availableTables []string) bool {
	for _, table := range availableTables {
		if table == tableName {
			return true
		}
	}
	log.Printf("⚠️  %s table not found, skipping", tableName)
	return false
}
