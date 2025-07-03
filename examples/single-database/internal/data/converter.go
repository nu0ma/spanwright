package data

import (
	"time"
)

// ConvertToStringArray converts an interface{} array to []string
func ConvertToStringArray(input interface{}) []string {
	if arr, ok := input.([]interface{}); ok {
		var result []string
		for _, item := range arr {
			if str, ok := item.(string); ok {
				result = append(result, str)
			}
		}
		return result
	}
	return []string{}
}

// ConvertToInt64Array converts an interface{} array to []int64
func ConvertToInt64Array(input interface{}) []int64 {
	if arr, ok := input.([]interface{}); ok {
		var result []int64
		for _, item := range arr {
			if num, ok := item.(float64); ok {
				result = append(result, int64(num))
			}
		}
		return result
	}
	return []int64{}
}

// ConvertFloatToInt64 safely converts float64 to int64
func ConvertFloatToInt64(input interface{}) int64 {
	if num, ok := input.(float64); ok {
		return int64(num)
	}
	return 0
}

// ParseTimeString parses time string in RFC3339 format
func ParseTimeString(timeStr string) (time.Time, error) {
	return time.Parse(time.RFC3339, timeStr)
}

// ConvertTimestamp converts a timestamp from various formats to appropriate database format
func ConvertTimestamp(input interface{}) interface{} {
	switch v := input.(type) {
	case string:
		// Try to parse as RFC3339 string
		if t, err := ParseTimeString(v); err == nil {
			return t
		}
		return v
	case float64:
		// Unix timestamp
		return int64(v)
	case int64:
		return v
	case time.Time:
		return v
	default:
		return input
	}
}

// GetStringValue safely extracts string value from interface{}
func GetStringValue(data map[string]interface{}, key string) string {
	if value, exists := data[key]; exists {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}

// GetInt64Value safely extracts int64 value from interface{}
func GetInt64Value(data map[string]interface{}, key string) int64 {
	if value, exists := data[key]; exists {
		if num, ok := value.(float64); ok {
			return int64(num)
		}
		if num, ok := value.(int64); ok {
			return num
		}
	}
	return 0
}

// GetBoolValue safely extracts bool value from interface{}
func GetBoolValue(data map[string]interface{}, key string) bool {
	if value, exists := data[key]; exists {
		if b, ok := value.(bool); ok {
			return b
		}
	}
	return false
}

// GetFloat64Value safely extracts float64 value from interface{}
func GetFloat64Value(data map[string]interface{}, key string) float64 {
	if value, exists := data[key]; exists {
		if num, ok := value.(float64); ok {
			return num
		}
		if num, ok := value.(int); ok {
			return float64(num)
		}
		if num, ok := value.(int64); ok {
			return float64(num)
		}
	}
	return 0.0
}

// GetInterfaceValue safely gets interface{} value, handling nulls
func GetInterfaceValue(data map[string]interface{}, key string) interface{} {
	if value, exists := data[key]; exists && value != nil {
		return value
	}
	return nil
}
