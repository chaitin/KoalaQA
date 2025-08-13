package retry_test

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/chaitin/koalaqa/pkg/retry"
)

func ExampleTimes() {
	// 简单重试3次
	err := retry.Times(func() error {
		// 模拟可能失败的操作
		return errors.New("临时错误")
	}, 3)

	if err != nil {
		fmt.Printf("重试失败: %v\n", err)
	}
}

func ExampleWithFixedDelay() {
	// 使用固定延迟重试
	err := retry.WithFixedDelay(func() error {
		// 模拟网络请求
		resp, err := http.Get("https://api.example.com/data")
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return fmt.Errorf("HTTP错误: %d", resp.StatusCode)
		}
		return nil
	}, 5, 2*time.Second)

	if err != nil {
		fmt.Printf("请求失败: %v\n", err)
	}
}

func ExampleWithExponentialBackoff() {
	// 使用指数退避重试
	err := retry.WithExponentialBackoff(func() error {
		// 模拟数据库连接
		return errors.New("连接超时")
	}, 5, 100*time.Millisecond, 10*time.Second)

	if err != nil {
		fmt.Printf("连接失败: %v\n", err)
	}
}

func ExampleDoWithData() {
	// 重试并返回数据
	data, err := retry.TimesWithData(func() (string, error) {
		// 模拟获取数据
		return "成功获取的数据", nil
	}, 3)

	if err != nil {
		fmt.Printf("获取数据失败: %v\n", err)
	} else {
		fmt.Printf("获取到数据: %s\n", data)
	}
}

func ExampleWithContext() {
	// 使用上下文控制超时
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := retry.WithContext(ctx, func() error {
		// 模拟长时间运行的操作
		time.Sleep(1 * time.Second)
		return errors.New("操作失败")
	}, 10)

	if err != nil {
		fmt.Printf("上下文控制的重试失败: %v\n", err)
	}
}

func ExampleConfig() {
	// 自定义配置
	config := &retry.Config{
		MaxAttempts: 5,
		Backoff: &retry.ExponentialBackoff{
			BaseDelay: 100 * time.Millisecond,
			MaxDelay:  5 * time.Second,
			Jitter:    true,
		},
		RetryIf: func(err error) bool {
			// 只重试特定类型的错误
			return errors.Is(err, context.DeadlineExceeded) ||
				errors.Is(err, context.Canceled)
		},
		OnRetry: func(attempt int, err error) {
			log.Printf("第%d次重试，错误: %v", attempt, err)
		},
		Context: context.Background(),
	}

	err := retry.Do(func() error {
		// 你的业务逻辑
		return errors.New("业务错误")
	}, config)

	if err != nil {
		fmt.Printf("自定义配置重试失败: %v\n", err)
	}
}

func ExampleLinearBackoff() {
	// 使用线性退避策略
	config := &retry.Config{
		MaxAttempts: 4,
		Backoff: &retry.LinearBackoff{
			BaseDelay: 200 * time.Millisecond,
		},
		OnRetry: func(attempt int, err error) {
			fmt.Printf("第%d次重试，延迟: %v\n", attempt,
				time.Duration(attempt)*200*time.Millisecond)
		},
	}

	err := retry.Do(func() error {
		return errors.New("测试错误")
	}, config)

	if err != nil {
		fmt.Printf("线性退避重试失败: %v\n", err)
	}
}

func ExampleIsRetryError() {
	// 错误处理示例
	err := retry.Times(func() error {
		return errors.New("持续失败")
	}, 3)

	if retry.IsRetryError(err) {
		attempts := retry.GetAttempts(err)
		fmt.Printf("重试错误，尝试了%d次\n", attempts)
	}
}
