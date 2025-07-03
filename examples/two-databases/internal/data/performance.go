package data

import (
	"context"
	"fmt"
	"time"
)

// PerformanceMetrics tracks validation performance
type PerformanceMetrics struct {
	StartTime         time.Time     `json:"start_time"`
	EndTime           time.Time     `json:"end_time"`
	Duration          time.Duration `json:"duration"`
	TablesValidated   int           `json:"tables_validated"`
	QueriesExecuted   int           `json:"queries_executed"`
	BatchOptimization bool          `json:"batch_optimization"`
}

// PerformanceTracker helps track validation performance
type PerformanceTracker struct {
	startTime time.Time
	queries   int
}

// NewPerformanceTracker creates a new performance tracker
func NewPerformanceTracker() *PerformanceTracker {
	return &PerformanceTracker{
		startTime: time.Now(),
		queries:   0,
	}
}

// TrackQuery increments the query counter
func (pt *PerformanceTracker) TrackQuery() {
	pt.queries++
}

// GetMetrics returns the current performance metrics
func (pt *PerformanceTracker) GetMetrics(tablesValidated int, batchOptimization bool) PerformanceMetrics {
	endTime := time.Now()
	return PerformanceMetrics{
		StartTime:         pt.startTime,
		EndTime:           endTime,
		Duration:          endTime.Sub(pt.startTime),
		TablesValidated:   tablesValidated,
		QueriesExecuted:   pt.queries,
		BatchOptimization: batchOptimization,
	}
}

// FormatMetrics returns a human-readable string of the metrics
func (pm PerformanceMetrics) FormatMetrics() string {
	optimization := "Sequential"
	if pm.BatchOptimization {
		optimization = "Batch Optimized"
	}
	
	queriesPerTable := float64(pm.QueriesExecuted) / float64(pm.TablesValidated)
	if pm.TablesValidated == 0 {
		queriesPerTable = 0
	}
	
	return fmt.Sprintf(
		"📊 Performance: %s | %d tables in %v | %d queries (%.1f per table) | Mode: %s",
		pm.Duration.Truncate(time.Millisecond),
		pm.TablesValidated,
		pm.Duration.Truncate(time.Millisecond),
		pm.QueriesExecuted,
		queriesPerTable,
		optimization,
	)
}

// WithPerformanceTracking wraps a validation function with performance tracking
func WithPerformanceTracking(ctx context.Context, name string, fn func(*PerformanceTracker) error) error {
	tracker := NewPerformanceTracker()
	fmt.Printf("🚀 Starting %s...\n", name)
	
	err := fn(tracker)
	
	// Note: Metrics will be logged by the calling function
	return err
}