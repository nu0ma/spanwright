package data

import (
	"encoding/json"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// ParseJSONFile parses a JSON file into a map
func ParseJSONFile(filePath string) (map[string]interface{}, error) {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("file not found: %s", filePath)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", filePath, err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from file %s: %w", filePath, err)
	}

	return result, nil
}

// ParseYAMLFile parses a YAML file into a struct
func ParseYAMLFile(filePath string, target interface{}) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("file not found: %s", filePath)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", filePath, err)
	}

	if err := yaml.Unmarshal(data, target); err != nil {
		return fmt.Errorf("failed to parse YAML from file %s: %w", filePath, err)
	}

	return nil
}

// DetectSeedDataFormat detects whether seed data is in organization or company format
func DetectSeedDataFormat(seedData map[string]interface{}) SeedDataFormat {
	if _, hasOrganization := seedData["organization"]; hasOrganization {
		return FormatOrganization
	}
	return FormatCompany
}

// SeedDataFormat represents the format of seed data
type SeedDataFormat int

const (
	FormatCompany SeedDataFormat = iota
	FormatOrganization
)

func (f SeedDataFormat) String() string {
	switch f {
	case FormatCompany:
		return "company"
	case FormatOrganization:
		return "organization"
	default:
		return "unknown"
	}
}
