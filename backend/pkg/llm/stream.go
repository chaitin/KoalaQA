package llm

import (
	"context"
	"errors"
)

type AskSessionStreamItem struct {
	Type    string
	Content string
}

type Stream[T any] struct {
	c    chan T
	stop chan struct{}
}

func (l *Stream[T]) Close() {
	close(l.stop)
}

func (l *Stream[T]) Recv(f func() (T, error)) {
	defer close(l.c)
	for {
		content, err := f()
		if err != nil {
			return
		}

		select {
		case <-l.stop:
			return
		case l.c <- content:
		}
	}
}

var ErrStreamStoped = errors.New("stream stoped")

func (l *Stream[T]) RecvOne(content T, finish bool) error {
	defer func() {
		if finish {
			close(l.c)
		}
	}()

	select {
	case <-l.stop:
		finish = true
		return ErrStreamStoped
	case l.c <- content:
	}

	return nil
}

func (l *Stream[T]) Read(ctx context.Context, f func(content T)) {
	defer l.Close()

	for {
		content, _, ok := l.Text(ctx)
		if !ok {
			return
		}

		f(content)
	}
}

func (l *Stream[T]) Text(ctx context.Context) (T, bool, bool) {
	select {
	case <-ctx.Done():
		return *new(T), true, false
	case content, ok := <-l.c:
		if !ok {
			return *new(T), false, false
		}

		return content, false, true
	}
}

func NewStream[T any]() *Stream[T] {
	return &Stream[T]{
		c:    make(chan T, 8),
		stop: make(chan struct{}),
	}
}
