package db

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"cloud.google.com/go/spanner"
	"temp-validation/internal/config"
)

// ConnectionPool manages a pool of Spanner client connections
type ConnectionPool struct {
	mu              sync.RWMutex
	clients         map[string]*pooledClient
	maxConnections  int
	idleTimeout     time.Duration
	maxIdleTime     time.Duration
	cleanupInterval time.Duration
	stopCleanup     chan struct{}
	cleanupWg       sync.WaitGroup
}

// pooledClient wraps a Spanner client with metadata
type pooledClient struct {
	client      *spanner.Client
	dbConfig    *config.DatabaseConfig
	lastUsed    time.Time
	inUse       bool
	createdAt   time.Time
	useCount    int64
}

// PoolConfig holds configuration for the connection pool
type PoolConfig struct {
	MaxConnections  int           // Maximum number of connections in pool
	IdleTimeout     time.Duration // How long to keep idle connections
	MaxIdleTime     time.Duration // Maximum time a connection can be idle
	CleanupInterval time.Duration // How often to clean up expired connections
}

// DefaultPoolConfig returns sensible defaults for the connection pool
func DefaultPoolConfig() PoolConfig {
	return PoolConfig{
		MaxConnections:  10,
		IdleTimeout:     5 * time.Minute,
		MaxIdleTime:     10 * time.Minute,
		CleanupInterval: 1 * time.Minute,
	}
}

// NewConnectionPool creates a new connection pool with the given configuration
func NewConnectionPool(poolConfig PoolConfig) *ConnectionPool {
	pool := &ConnectionPool{
		clients:         make(map[string]*pooledClient),
		maxConnections:  poolConfig.MaxConnections,
		idleTimeout:     poolConfig.IdleTimeout,
		maxIdleTime:     poolConfig.MaxIdleTime,
		cleanupInterval: poolConfig.CleanupInterval,
		stopCleanup:     make(chan struct{}),
	}
	
	// Start cleanup goroutine
	pool.startCleanup()
	
	return pool
}

// GetClient returns a Spanner client from the pool, creating one if necessary
func (p *ConnectionPool) GetClient(ctx context.Context, dbConfig *config.DatabaseConfig) (*spanner.Client, error) {
	key := dbConfig.DatabasePath()
	
	p.mu.Lock()
	defer p.mu.Unlock()
	
	// Check if we have an existing client
	if pooled, exists := p.clients[key]; exists && !pooled.inUse {
		// Validate the client is still healthy
		if p.isClientHealthy(ctx, pooled.client) {
			pooled.inUse = true
			pooled.lastUsed = time.Now()
			pooled.useCount++
			log.Printf("🔄 Reusing pooled Spanner client for %s (use count: %d)", key, pooled.useCount)
			return pooled.client, nil
		} else {
			// Client is unhealthy, remove it
			log.Printf("🚨 Removing unhealthy client for %s", key)
			pooled.client.Close()
			delete(p.clients, key)
		}
	}
	
	// Check pool size limit
	activeConnections := p.countActiveConnections()
	if activeConnections >= p.maxConnections {
		// Try to find an idle connection to evict
		if !p.evictIdleConnection() {
			return nil, fmt.Errorf("connection pool is full (%d/%d connections)", activeConnections, p.maxConnections)
		}
	}
	
	// Create new client
	log.Printf("🔧 Creating new Spanner client for %s", key)
	client, err := spanner.NewClient(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to create Spanner client: %w", err)
	}
	
	// Add to pool
	pooled := &pooledClient{
		client:    client,
		dbConfig:  dbConfig,
		lastUsed:  time.Now(),
		inUse:     true,
		createdAt: time.Now(),
		useCount:  1,
	}
	
	p.clients[key] = pooled
	log.Printf("📊 Pool stats: %d/%d connections", len(p.clients), p.maxConnections)
	
	return client, nil
}

// ReleaseClient returns a client to the pool
func (p *ConnectionPool) ReleaseClient(dbConfig *config.DatabaseConfig) {
	key := dbConfig.DatabasePath()
	
	p.mu.Lock()
	defer p.mu.Unlock()
	
	if pooled, exists := p.clients[key]; exists {
		pooled.inUse = false
		pooled.lastUsed = time.Now()
		log.Printf("📤 Released Spanner client for %s back to pool", key)
	}
}

// Close closes all connections in the pool
func (p *ConnectionPool) Close() error {
	log.Printf("🛑 Closing connection pool...")
	
	// Stop cleanup goroutine
	close(p.stopCleanup)
	p.cleanupWg.Wait()
	
	p.mu.Lock()
	defer p.mu.Unlock()
	
	// Close all clients
	for key, pooled := range p.clients {
		log.Printf("🔒 Closing client for %s", key)
		pooled.client.Close()
	}
	
	p.clients = make(map[string]*pooledClient)
	log.Printf("✅ Connection pool closed")
	
	return nil
}

// GetPoolStats returns statistics about the connection pool
func (p *ConnectionPool) GetPoolStats() PoolStats {
	p.mu.RLock()
	defer p.mu.RUnlock()
	
	stats := PoolStats{
		TotalConnections: len(p.clients),
		MaxConnections:   p.maxConnections,
		ActiveConnections: p.countActiveConnections(),
		IdleConnections:  0,
	}
	
	for _, pooled := range p.clients {
		if !pooled.inUse {
			stats.IdleConnections++
		}
	}
	
	return stats
}

// PoolStats contains statistics about the connection pool
type PoolStats struct {
	TotalConnections  int
	ActiveConnections int
	IdleConnections   int
	MaxConnections    int
}

// isClientHealthy checks if a Spanner client is still healthy
func (p *ConnectionPool) isClientHealthy(ctx context.Context, client *spanner.Client) bool {
	// Simple health check: try to execute a basic query
	healthCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	
	stmt := spanner.NewStatement("SELECT 1")
	iter := client.Single().Query(healthCtx, stmt)
	defer iter.Stop()
	
	_, err := iter.Next()
	if err != nil {
		log.Printf("⚠️ Health check failed: %v", err)
		return false
	}
	
	return true
}

// countActiveConnections counts the number of connections currently in use
func (p *ConnectionPool) countActiveConnections() int {
	count := 0
	for _, pooled := range p.clients {
		if pooled.inUse {
			count++
		}
	}
	return count
}

// evictIdleConnection tries to evict an idle connection to make room
func (p *ConnectionPool) evictIdleConnection() bool {
	var oldestKey string
	var oldestTime time.Time
	
	for key, pooled := range p.clients {
		if !pooled.inUse && (oldestKey == "" || pooled.lastUsed.Before(oldestTime)) {
			oldestKey = key
			oldestTime = pooled.lastUsed
		}
	}
	
	if oldestKey != "" {
		log.Printf("🗑️ Evicting idle connection for %s", oldestKey)
		p.clients[oldestKey].client.Close()
		delete(p.clients, oldestKey)
		return true
	}
	
	return false
}

// startCleanup starts the background cleanup goroutine
func (p *ConnectionPool) startCleanup() {
	p.cleanupWg.Add(1)
	go func() {
		defer p.cleanupWg.Done()
		
		ticker := time.NewTicker(p.cleanupInterval)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				p.cleanup()
			case <-p.stopCleanup:
				return
			}
		}
	}()
}

// cleanup removes expired idle connections
func (p *ConnectionPool) cleanup() {
	p.mu.Lock()
	defer p.mu.Unlock()
	
	now := time.Now()
	var toRemove []string
	
	for key, pooled := range p.clients {
		if !pooled.inUse {
			idleTime := now.Sub(pooled.lastUsed)
			totalTime := now.Sub(pooled.createdAt)
			
			if idleTime > p.idleTimeout || totalTime > p.maxIdleTime {
				toRemove = append(toRemove, key)
			}
		}
	}
	
	for _, key := range toRemove {
		log.Printf("🧹 Cleaning up expired connection for %s", key)
		p.clients[key].client.Close()
		delete(p.clients, key)
	}
	
	if len(toRemove) > 0 {
		log.Printf("📊 Pool cleanup: removed %d connections, %d remaining", len(toRemove), len(p.clients))
	}
}