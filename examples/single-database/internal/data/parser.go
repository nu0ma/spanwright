package data

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

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