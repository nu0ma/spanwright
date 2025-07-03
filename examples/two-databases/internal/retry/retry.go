package retry

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"cloud.google.com/go/spanner"
	"google.golang.org/grpc/codes"
)

// RetryConfig holds configuration for retry behavior
type RetryConfig struct {
	MaxAttempts     int           // Maximum number of retry attempts
	InitialDelay    time.Duration // Initial delay before first retry
	MaxDelay        time.Duration // Maximum delay between retries
	Multiplier      float64       // Exponential backoff multiplier
	Jitter          float64       // Random jitter factor (0.0 to 1.0)
	RetryableErrors []RetryableErrorType
}

// RetryableErrorType represents types of errors that should be retried
type RetryableErrorType int

const (
	NetworkError RetryableErrorType = iota
	TemporaryError
	ResourceExhausted
	DeadlineExceeded
	Unavailable
	Internal
)

// DefaultRetryConfig returns sensible defaults for retry configuration
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 100 * time.Millisecond,
		MaxDelay:     30 * time.Second,
		Multiplier:   2.0,
		Jitter:       0.1,
		RetryableErrors: []RetryableErrorType{
			NetworkError,
			TemporaryError,
			ResourceExhausted,
			DeadlineExceeded,
			Unavailable,
		},
	}
}

// DatabaseRetryConfig returns retry configuration optimized for database operations
func DatabaseRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:  5,
		InitialDelay: 200 * time.Millisecond,
		MaxDelay:     10 * time.Second,
		Multiplier:   1.5,
		Jitter:       0.2,
		RetryableErrors: []RetryableErrorType{
			NetworkError,
			TemporaryError,
			ResourceExhausted,
			DeadlineExceeded,
			Unavailable,
			Internal,
		},
	}
}

// RetryAttempt represents information about a retry attempt
type RetryAttempt struct {
	Attempt int
	Delay   time.Duration
	Error   error
}

// RetryFunc is a function that can be retried
type RetryFunc func(ctx context.Context, attempt int) error

// WithRetry executes a function with retry logic and exponential backoff
func WithRetry(ctx context.Context, config RetryConfig, operation string, fn RetryFunc) error {
	var lastErr error
	
	for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
		// Execute the function
		err := fn(ctx, attempt)
		
		if err == nil {
			// Success!
			if attempt > 1 {
				log.Printf("✅ %s succeeded on attempt %d", operation, attempt)
			}
			return nil
		}
		
		lastErr = err
		
		// Check if this is a retryable error
		if !isRetryableError(err, config.RetryableErrors) {
			log.Printf("❌ %s failed with non-retryable error: %v", operation, err)
			return err
		}
		
		// Don't delay on the last attempt
		if attempt == config.MaxAttempts {
			log.Printf("❌ %s failed after %d attempts: %v", operation, config.MaxAttempts, err)
			break
		}
		
		// Calculate delay with exponential backoff and jitter
		delay := calculateDelay(attempt-1, config)
		
		log.Printf("⚠️ %s failed on attempt %d/%d, retrying in %v: %v", 
			operation, attempt, config.MaxAttempts, delay.Truncate(time.Millisecond), err)
		
		// Wait for the calculated delay
		select {
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled: %w", ctx.Err())
		case <-time.After(delay):
			// Continue to next attempt
		}
	}
	
	return fmt.Errorf("max retry attempts (%d) exceeded: %w", config.MaxAttempts, lastErr)
}

// calculateDelay calculates the delay for a retry attempt with exponential backoff and jitter
func calculateDelay(attempt int, config RetryConfig) time.Duration {
	// Calculate exponential backoff
	delay := float64(config.InitialDelay) * math.Pow(config.Multiplier, float64(attempt))
	
	// Apply jitter (random variation)
	if config.Jitter > 0 {
		jitter := 1 + (rand.Float64()-0.5)*2*config.Jitter
		delay *= jitter
	}
	
	// Ensure delay doesn't exceed maximum
	if time.Duration(delay) > config.MaxDelay {
		delay = float64(config.MaxDelay)
	}
	
	return time.Duration(delay)
}

// isRetryableError determines if an error should be retried
func isRetryableError(err error, retryableTypes []RetryableErrorType) bool {
	if err == nil {
		return false
	}
	
	// Check for context cancellation (never retry)
	if err == context.Canceled || err == context.DeadlineExceeded {
		return false
	}
	
	// Check Spanner-specific errors
	spannerCode := spanner.ErrCode(err)
	errorType := classifySpannerError(spannerCode)
	
	// Check if this error type is configured as retryable
	for _, retryableType := range retryableTypes {
		if errorType == retryableType {
			return true
		}
	}
	
	return false
}

// classifySpannerError classifies a Spanner error code into a retryable error type
func classifySpannerError(code codes.Code) RetryableErrorType {
	switch code {
	case codes.Unavailable:
		return Unavailable
	case codes.DeadlineExceeded:
		return DeadlineExceeded
	case codes.ResourceExhausted:
		return ResourceExhausted
	case codes.Internal:
		return Internal
	case codes.Unknown:
		return NetworkError
	default:
		return NetworkError // Default to network error for unknown codes
	}
}

// DatabaseOperation wraps a database operation with retry logic
func DatabaseOperation(ctx context.Context, operation string, fn RetryFunc) error {
	config := DatabaseRetryConfig()
	return WithRetry(ctx, config, operation, fn)
}

// QuickRetry provides a simple retry mechanism for quick operations
func QuickRetry(ctx context.Context, operation string, fn RetryFunc) error {
	config := RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 50 * time.Millisecond,
		MaxDelay:     1 * time.Second,
		Multiplier:   2.0,
		Jitter:       0.1,
		RetryableErrors: []RetryableErrorType{
			NetworkError,
			TemporaryError,
			Unavailable,
		},
	}
	return WithRetry(ctx, config, operation, fn)
}

// RetryableClient wraps a Spanner client with automatic retry logic
type RetryableClient struct {
	client *spanner.Client
	config RetryConfig
}

// NewRetryableClient creates a new retryable Spanner client wrapper
func NewRetryableClient(client *spanner.Client, config RetryConfig) *RetryableClient {
	return &RetryableClient{
		client: client,
		config: config,
	}
}

// Query executes a query with retry logic
func (rc *RetryableClient) Query(ctx context.Context, stmt spanner.Statement) (*spanner.RowIterator, error) {
	var iter *spanner.RowIterator
	
	err := WithRetry(ctx, rc.config, "Spanner Query", func(ctx context.Context, attempt int) error {
		iter = rc.client.Single().Query(ctx, stmt)
		
		// Test the iterator by trying to peek at the first row
		_, err := iter.Next()
		if err != nil {
			iter.Stop() // Clean up on error
			return err
		}
		
		// Reset iterator for actual use
		iter.Stop()
		iter = rc.client.Single().Query(ctx, stmt)
		return nil
	})
	
	if err != nil {
		return nil, err
	}
	
	return iter, nil
}

// Apply executes mutations with retry logic
func (rc *RetryableClient) Apply(ctx context.Context, mutations []*spanner.Mutation) error {
	return WithRetry(ctx, rc.config, "Spanner Apply", func(ctx context.Context, attempt int) error {
		_, err := rc.client.Apply(ctx, mutations)
		return err
	})
}