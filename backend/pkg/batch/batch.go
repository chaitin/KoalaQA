package batch

import (
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
)

type Batcher[T any] interface {
	Send(data T)
}

type bacher[T any] struct {
	c         chan T
	cache     []T
	cacheSize int
	logger    *glog.Logger
	exec      func(data []T) error
}

func (b *bacher[T]) Send(data T) {
	select {
	case b.c <- data:
	default:
		b.logger.Warn("batch chan overflow, drop data")
	}
}

func (b *bacher[T]) run() {
	ticker := time.NewTicker(time.Second * 5)
	for {
		select {
		case <-ticker.C:
			if len(b.cache) == 0 {
				continue
			}
		case data := <-b.c:
			b.cache = append(b.cache, data)

			if len(b.cache) < b.cacheSize {
				continue
			}
		}

		err := b.exec(b.cache)
		if err != nil {
			b.logger.WithErr(err).Warn("bacher exec failed")
		}
		b.cache = b.cache[:0]
	}
}

func newBatcher[T any](name string, exec func(data []T) error) *bacher[T] {
	b := &bacher[T]{
		c:         make(chan T, 1000),
		cache:     make([]T, 0, 1000),
		cacheSize: 1000,
		logger:    glog.Module("batcher", name),
		exec:      exec,
	}

	go b.run()

	return b
}
