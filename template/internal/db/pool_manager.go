package db

import (
	"context"
	"sync"

	"cloud.google.com/go/spanner"
	"e2e-sandbox/internal/config"
)

// Global pool manager instance
var (
	globalPool     *ConnectionPool
	globalPoolOnce sync.Once
)

// PooledSpannerManager wraps SpannerManager with connection pooling
type PooledSpannerManager struct {
	*SpannerManager
	pool     *ConnectionPool
	dbConfig *config.DatabaseConfig
}

// GetGlobalPool returns the global connection pool instance
func GetGlobalPool() *ConnectionPool {
	globalPoolOnce.Do(func() {
		config := DefaultPoolConfig()
		globalPool = NewConnectionPool(config)
	})
	return globalPool
}

// NewPooledSpannerManager creates a new SpannerManager that uses connection pooling
func NewPooledSpannerManager(ctx context.Context, dbConfig *config.DatabaseConfig) (*PooledSpannerManager, error) {
	pool := GetGlobalPool()
	
	// Get client from pool
	client, err := pool.GetClient(ctx, dbConfig)
	if err != nil {
		return nil, err
	}
	
	// Create SpannerManager with pooled client
	sm := &SpannerManager{
		config:          dbConfig,
		client:          client,
		schemaMap:       make(map[string]map[string]string),
	}
	sm.mutationBuilder = NewMutationBuilder(sm.schemaMap)
	
	return &PooledSpannerManager{
		SpannerManager: sm,
		pool:           pool,
		dbConfig:       dbConfig,
	}, nil
}

// Close returns the client to the pool instead of closing it
func (psm *PooledSpannerManager) Close() error {
	if psm.pool != nil && psm.dbConfig != nil {
		psm.pool.ReleaseClient(psm.dbConfig)
	}
	return nil
}

// GetPoolStats returns statistics about the connection pool
func (psm *PooledSpannerManager) GetPoolStats() PoolStats {
	if psm.pool != nil {
		return psm.pool.GetPoolStats()
	}
	return PoolStats{}
}

// CloseGlobalPool closes the global connection pool
// This should be called during application shutdown
func CloseGlobalPool() error {
	if globalPool != nil {
		return globalPool.Close()
	}
	return nil
}

// WithPooledClient executes a function with a pooled Spanner client
// This is a convenience function for one-off operations
func WithPooledClient(ctx context.Context, dbConfig *config.DatabaseConfig, fn func(*spanner.Client) error) error {
	pool := GetGlobalPool()
	
	client, err := pool.GetClient(ctx, dbConfig)
	if err != nil {
		return err
	}
	
	defer pool.ReleaseClient(dbConfig)
	
	return fn(client)
}