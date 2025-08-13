package retry

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"
)

// Error 表示重试过程中的错误
type Error struct {
	Attempts int
	LastErr  error
}

func (e *Error) Error() string {
	return fmt.Sprintf("retry failed, attempts: %d, last error: %v", e.Attempts, e.LastErr)
}

func (e *Error) Unwrap() error {
	return e.LastErr
}

// Func 是需要重试的函数类型
type Func func() error

// FuncWithData 是返回数据的需要重试的函数类型
type FuncWithData[T any] func() (T, error)

// BackoffStrategy 表示退避策略接口
type BackoffStrategy interface {
	Next(attempt int) time.Duration
}

// FixedBackoff 固定延迟策略
type FixedBackoff struct {
	Delay time.Duration
}

func (f *FixedBackoff) Next(attempt int) time.Duration {
	return f.Delay
}

// LinearBackoff 线性增长延迟策略
type LinearBackoff struct {
	BaseDelay time.Duration
}

func (l *LinearBackoff) Next(attempt int) time.Duration {
	return time.Duration(attempt) * l.BaseDelay
}

// ExponentialBackoff 指数退避策略
type ExponentialBackoff struct {
	BaseDelay time.Duration
	MaxDelay  time.Duration
	Jitter    bool
}

func (e *ExponentialBackoff) Next(attempt int) time.Duration {
	delay := time.Duration(float64(e.BaseDelay) * math.Pow(2, float64(attempt-1)))

	if e.MaxDelay > 0 && delay > e.MaxDelay {
		delay = e.MaxDelay
	}

	if e.Jitter {
		// 添加随机抖动，避免惊群效应
		jitter := time.Duration(rand.Float64() * float64(delay) * 0.1)
		delay += jitter
	}

	return delay
}

// Config 重试配置
type Config struct {
	MaxAttempts int
	Backoff     BackoffStrategy
	RetryIf     func(error) bool
	OnRetry     func(attempt int, err error)
	Context     context.Context
}

// DefaultConfig 返回默认配置
func DefaultConfig() *Config {
	return &Config{
		MaxAttempts: 3,
		Backoff: &FixedBackoff{
			Delay: 100 * time.Millisecond,
		},
		RetryIf: func(err error) bool {
			return err != nil
		},
		Context: context.Background(),
	}
}

// Do 执行重试逻辑，不返回数据
func Do(fn Func, config *Config) error {
	if config == nil {
		config = DefaultConfig()
	}

	var lastErr error
	for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
		// 检查上下文是否已取消
		if config.Context != nil {
			select {
			case <-config.Context.Done():
				return config.Context.Err()
			default:
			}
		}

		err := fn()
		if err == nil {
			return nil // 成功，无需重试
		}

		lastErr = err

		// 检查是否应该重试这个错误
		if config.RetryIf != nil && !config.RetryIf(err) {
			break
		}

		// 如果这是最后一次尝试，不需要等待
		if attempt == config.MaxAttempts {
			break
		}

		// 调用重试回调
		if config.OnRetry != nil {
			config.OnRetry(attempt, err)
		}

		// 计算延迟时间并等待
		if config.Backoff != nil {
			delay := config.Backoff.Next(attempt)
			if delay > 0 {
				select {
				case <-time.After(delay):
				case <-config.Context.Done():
					return config.Context.Err()
				}
			}
		}
	}

	return &Error{
		Attempts: config.MaxAttempts,
		LastErr:  lastErr,
	}
}

// DoWithData 执行重试逻辑，返回数据
func DoWithData[T any](fn FuncWithData[T], config *Config) (T, error) {
	var zero T
	if config == nil {
		config = DefaultConfig()
	}

	var lastErr error
	for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
		// 检查上下文是否已取消
		if config.Context != nil {
			select {
			case <-config.Context.Done():
				return zero, config.Context.Err()
			default:
			}
		}

		result, err := fn()
		if err == nil {
			return result, nil // 成功，返回结果
		}

		lastErr = err

		// 检查是否应该重试这个错误
		if config.RetryIf != nil && !config.RetryIf(err) {
			break
		}

		// 如果这是最后一次尝试，不需要等待
		if attempt == config.MaxAttempts {
			break
		}

		// 调用重试回调
		if config.OnRetry != nil {
			config.OnRetry(attempt, err)
		}

		// 计算延迟时间并等待
		if config.Backoff != nil {
			delay := config.Backoff.Next(attempt)
			if delay > 0 {
				select {
				case <-time.After(delay):
				case <-config.Context.Done():
					return zero, config.Context.Err()
				}
			}
		}
	}

	return zero, &Error{
		Attempts: config.MaxAttempts,
		LastErr:  lastErr,
	}
}

// 便捷函数

// WithFixedDelay 使用固定延迟进行重试
func WithFixedDelay(fn Func, maxAttempts int, delay time.Duration) error {
	config := &Config{
		MaxAttempts: maxAttempts,
		Backoff: &FixedBackoff{
			Delay: delay,
		},
		RetryIf: func(err error) bool {
			return err != nil
		},
		Context: context.Background(),
	}
	return Do(fn, config)
}

// WithExponentialBackoff 使用指数退避进行重试
func WithExponentialBackoff(fn Func, maxAttempts int, baseDelay, maxDelay time.Duration) error {
	config := &Config{
		MaxAttempts: maxAttempts,
		Backoff: &ExponentialBackoff{
			BaseDelay: baseDelay,
			MaxDelay:  maxDelay,
			Jitter:    true,
		},
		RetryIf: func(err error) bool {
			return err != nil
		},
		Context: context.Background(),
	}
	return Do(fn, config)
}

// WithContext 使用上下文进行重试
func WithContext(ctx context.Context, fn Func, maxAttempts int) error {
	config := &Config{
		MaxAttempts: maxAttempts,
		Backoff: &FixedBackoff{
			Delay: 100 * time.Millisecond,
		},
		RetryIf: func(err error) bool {
			return err != nil
		},
		Context: ctx,
	}
	return Do(fn, config)
}

// Times 简单的重试N次，使用默认配置
func Times(fn Func, maxAttempts int) error {
	config := DefaultConfig()
	config.MaxAttempts = maxAttempts
	return Do(fn, config)
}

// TimesWithData 简单的重试N次并返回数据，使用默认配置
func TimesWithData[T any](fn FuncWithData[T], maxAttempts int) (T, error) {
	config := DefaultConfig()
	config.MaxAttempts = maxAttempts
	return DoWithData(fn, config)
}

// IsRetryError 检查错误是否是重试错误
func IsRetryError(err error) bool {
	var retryErr *Error
	return errors.As(err, &retryErr)
}

// GetAttempts 从重试错误中获取尝试次数
func GetAttempts(err error) int {
	var retryErr *Error
	if errors.As(err, &retryErr) {
		return retryErr.Attempts
	}
	return 0
}
