package cache

import (
	"errors"
	"time"

	gocache "github.com/patrickmn/go-cache"
)

type Cache[T any] interface {
	SetTTL(key string, value T, dur time.Duration) error
	Set(key string, value T) error
	Get(key string) (T, bool)
	Range(fn func(key string, value T) bool)
	Renewal(key string) error
}

type cache[T any] struct {
	store *gocache.Cache
	dur   time.Duration
}

func New[T any](dur time.Duration) Cache[T] {
	store := gocache.New(dur, dur*2)
	return &cache[T]{
		store: store,
		dur:   dur,
	}
}

func (c *cache[T]) SetTTL(key string, value T, dur time.Duration) error {
	c.store.Set(key, value, dur)
	return nil
}

func (c *cache[T]) Set(key string, value T) error {
	c.store.Set(key, value, c.dur)
	return nil
}

func (c *cache[T]) Get(key string) (T, bool) {
	var zero T

	value, found := c.store.Get(key)
	if !found {
		return zero, false
	}

	if typedValue, ok := value.(T); ok {
		return typedValue, true
	}

	return zero, false
}

func (c *cache[T]) Range(fn func(key string, value T) bool) {
	items := c.store.Items()
	for key, item := range items {
		if typedValue, ok := item.Object.(T); ok {
			if !fn(key, typedValue) {
				break
			}
		}
	}
}

func (c *cache[T]) Renewal(key string) error {
	v, ok := c.Get(key)
	if !ok {
		return errors.New("key not found")
	}
	return c.SetTTL(key, v, c.dur)
}
