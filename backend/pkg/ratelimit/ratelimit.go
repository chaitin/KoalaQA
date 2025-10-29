package ratelimit

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type Limiter interface {
	Allow(key string, period time.Duration, num int) bool
}

type limiter struct {
	l       *rate.Limiter
	lastUse time.Time
}

func newLimiter(period time.Duration, num int) *limiter {
	return &limiter{
		l:       rate.NewLimiter(rate.Every(period), num),
		lastUse: time.Now(),
	}
}

type multiLimiter struct {
	l *sync.Map
}

func (l *multiLimiter) Allow(key string, period time.Duration, num int) bool {
	data, _ := l.l.LoadOrStore(key, newLimiter(period, num))
	cacheLimiter := data.(*limiter)
	cacheLimiter.lastUse = time.Now()

	return cacheLimiter.l.Allow()
}

func (l *multiLimiter) clearLoop() {
	for {
		time.Sleep(time.Hour)

		now := time.Now()

		l.l.Range(func(key, value any) bool {
			li := value.(*limiter)

			if li.lastUse.Before(now.Add(-time.Hour)) {
				l.l.Delete(key)
			}

			return true
		})
	}
}

func New() Limiter {
	l := &multiLimiter{
		l: &sync.Map{},
	}

	go l.clearLoop()
	return l
}
