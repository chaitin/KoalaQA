package retry

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestTimes(t *testing.T) {
	// 测试成功情况
	t.Run("成功案例", func(t *testing.T) {
		attempts := 0
		err := Times(func() error {
			attempts++
			if attempts < 2 {
				return errors.New("临时失败")
			}
			return nil
		}, 3)

		if err != nil {
			t.Errorf("期望成功，但得到错误: %v", err)
		}
		if attempts != 2 {
			t.Errorf("期望尝试2次，实际尝试%d次", attempts)
		}
	})

	// 测试失败情况
	t.Run("失败案例", func(t *testing.T) {
		attempts := 0
		err := Times(func() error {
			attempts++
			return errors.New("持续失败")
		}, 3)

		if err == nil {
			t.Error("期望失败，但成功了")
		}
		if attempts != 3 {
			t.Errorf("期望尝试3次，实际尝试%d次", attempts)
		}

		if !IsRetryError(err) {
			t.Error("期望是重试错误")
		}
		if GetAttempts(err) != 3 {
			t.Errorf("期望尝试次数为3，实际为%d", GetAttempts(err))
		}
	})
}

func TestTimesWithData(t *testing.T) {
	// 测试成功返回数据
	t.Run("成功返回数据", func(t *testing.T) {
		attempts := 0
		data, err := TimesWithData(func() (string, error) {
			attempts++
			if attempts < 2 {
				return "", errors.New("临时失败")
			}
			return "成功数据", nil
		}, 3)

		if err != nil {
			t.Errorf("期望成功，但得到错误: %v", err)
		}
		if data != "成功数据" {
			t.Errorf("期望数据为'成功数据'，实际为'%s'", data)
		}
		if attempts != 2 {
			t.Errorf("期望尝试2次，实际尝试%d次", attempts)
		}
	})

	// 测试失败情况
	t.Run("失败案例", func(t *testing.T) {
		attempts := 0
		data, err := TimesWithData(func() (int, error) {
			attempts++
			return 0, errors.New("持续失败")
		}, 3)

		if err == nil {
			t.Error("期望失败，但成功了")
		}
		if data != 0 {
			t.Errorf("期望返回零值0，实际为%d", data)
		}
		if attempts != 3 {
			t.Errorf("期望尝试3次，实际尝试%d次", attempts)
		}
	})
}

func TestWithFixedDelay(t *testing.T) {
	start := time.Now()
	attempts := 0

	err := WithFixedDelay(func() error {
		attempts++
		return errors.New("失败")
	}, 3, 10*time.Millisecond)

	duration := time.Since(start)

	if err == nil {
		t.Error("期望失败，但成功了")
	}
	if attempts != 3 {
		t.Errorf("期望尝试3次，实际尝试%d次", attempts)
	}

	// 检查延迟时间（允许一定误差）
	expectedDelay := 2 * 10 * time.Millisecond // 2次延迟
	if duration < expectedDelay {
		t.Errorf("期望至少延迟%v，实际延迟%v", expectedDelay, duration)
	}
}

func TestWithContext(t *testing.T) {
	// 测试上下文取消
	t.Run("上下文取消", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())

		attempts := 0
		go func() {
			time.Sleep(50 * time.Millisecond)
			cancel()
		}()

		err := WithContext(ctx, func() error {
			attempts++
			time.Sleep(30 * time.Millisecond)
			return errors.New("测试错误")
		}, 5)

		if err != context.Canceled {
			t.Errorf("期望上下文取消错误，实际错误: %v", err)
		}
		if attempts < 1 {
			t.Error("期望至少尝试1次")
		}
	})

	// 测试上下文超时
	t.Run("上下文超时", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		err := WithContext(ctx, func() error {
			time.Sleep(50 * time.Millisecond)
			return errors.New("测试错误")
		}, 5)

		if !errors.Is(err, context.DeadlineExceeded) {
			t.Errorf("期望上下文超时错误，实际错误: %v", err)
		}
	})
}

func TestBackoffStrategies(t *testing.T) {
	// 测试固定延迟
	t.Run("固定延迟", func(t *testing.T) {
		backoff := &FixedBackoff{Delay: 100 * time.Millisecond}

		for i := 1; i <= 5; i++ {
			delay := backoff.Next(i)
			if delay != 100*time.Millisecond {
				t.Errorf("期望固定延迟100ms，实际为%v", delay)
			}
		}
	})

	// 测试线性延迟
	t.Run("线性延迟", func(t *testing.T) {
		backoff := &LinearBackoff{BaseDelay: 100 * time.Millisecond}

		expectedDelays := []time.Duration{
			100 * time.Millisecond, // attempt 1
			200 * time.Millisecond, // attempt 2
			300 * time.Millisecond, // attempt 3
		}

		for i, expected := range expectedDelays {
			delay := backoff.Next(i + 1)
			if delay != expected {
				t.Errorf("尝试%d: 期望延迟%v，实际为%v", i+1, expected, delay)
			}
		}
	})

	// 测试指数延迟
	t.Run("指数延迟", func(t *testing.T) {
		backoff := &ExponentialBackoff{
			BaseDelay: 100 * time.Millisecond,
			MaxDelay:  1 * time.Second,
			Jitter:    false,
		}

		expectedDelays := []time.Duration{
			100 * time.Millisecond,  // attempt 1: 100 * 2^0
			200 * time.Millisecond,  // attempt 2: 100 * 2^1
			400 * time.Millisecond,  // attempt 3: 100 * 2^2
			800 * time.Millisecond,  // attempt 4: 100 * 2^3
			1000 * time.Millisecond, // attempt 5: 100 * 2^4 (限制到MaxDelay)
		}

		for i, expected := range expectedDelays {
			delay := backoff.Next(i + 1)
			if delay != expected {
				t.Errorf("尝试%d: 期望延迟%v，实际为%v", i+1, expected, delay)
			}
		}
	})
}

func TestCustomConfig(t *testing.T) {
	attempts := 0
	retryCallbacks := 0

	config := &Config{
		MaxAttempts: 4,
		Backoff:     &FixedBackoff{Delay: 1 * time.Millisecond},
		RetryIf: func(err error) bool {
			return err.Error() == "可重试错误"
		},
		OnRetry: func(attempt int, err error) {
			retryCallbacks++
		},
		Context: context.Background(),
	}

	// 测试可重试错误
	err := Do(func() error {
		attempts++
		if attempts < 3 {
			return errors.New("可重试错误")
		}
		return nil
	}, config)

	if err != nil {
		t.Errorf("期望成功，但得到错误: %v", err)
	}
	if attempts != 3 {
		t.Errorf("期望尝试3次，实际尝试%d次", attempts)
	}
	if retryCallbacks != 2 {
		t.Errorf("期望2次重试回调，实际%d次", retryCallbacks)
	}

	// 重置计数器
	attempts = 0
	retryCallbacks = 0

	// 测试不可重试错误
	err = Do(func() error {
		attempts++
		return errors.New("不可重试错误")
	}, config)

	if err == nil {
		t.Error("期望失败，但成功了")
	}
	if attempts != 1 {
		t.Errorf("期望尝试1次，实际尝试%d次", attempts)
	}
	if retryCallbacks != 0 {
		t.Errorf("期望0次重试回调，实际%d次", retryCallbacks)
	}
}

func TestErrorHandling(t *testing.T) {
	// 测试普通错误
	normalErr := errors.New("普通错误")
	if IsRetryError(normalErr) {
		t.Error("普通错误不应该是重试错误")
	}
	if GetAttempts(normalErr) != 0 {
		t.Error("普通错误的尝试次数应该为0")
	}

	// 测试重试错误
	retryErr := &Error{
		Attempts: 5,
		LastErr:  errors.New("内部错误"),
	}

	if !IsRetryError(retryErr) {
		t.Error("应该识别为重试错误")
	}
	if GetAttempts(retryErr) != 5 {
		t.Errorf("期望尝试次数为5，实际为%d", GetAttempts(retryErr))
	}

	// 测试错误包装
	wrappedErr := &Error{
		Attempts: 3,
		LastErr:  normalErr,
	}

	if !errors.Is(wrappedErr, normalErr) {
		t.Error("应该能unwrap到原始错误")
	}
}
