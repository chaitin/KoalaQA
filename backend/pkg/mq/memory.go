package mq

import (
	"context"
	"errors"
	"sync"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/trace"
)

type msgHeader struct {
	ctx context.Context
}
type msg struct {
	header msgHeader
	data   Message
}

type memoryQueue struct {
	messge chan msg
	stop   chan struct{}
}

type Memory struct {
	lock sync.Mutex

	logger    *glog.Logger
	queue     map[string]*memoryQueue
	queueSize int
}

func newMemory() *Memory {
	return &Memory{
		logger:    glog.Module("mq", "memory"),
		queue:     make(map[string]*memoryQueue),
		queueSize: 1000,
	}
}

func (m *Memory) getChan(key string, create bool) *memoryQueue {
	m.lock.Lock()
	defer m.lock.Unlock()

	c, ok := m.queue[key]
	if !ok {
		if create {
			c = &memoryQueue{
				messge: make(chan msg, m.queueSize),
				stop:   make(chan struct{}),
			}
			m.queue[key] = c
			return c
		}
		return nil
	}

	return c
}

func (m *Memory) Publish(ctx context.Context, topic Topic, data Message) error {
	if topic.Persistence() {
		return errors.New("memory queue can not persistence")
	}
	c := m.getChan(topic.Name(), false)
	if c == nil {
		m.logger.WithContext(ctx).With("topic", topic).Debug("no subscriber, discard message")
		return nil
	}

	select {
	case <-c.stop:
		m.logger.WithContext(ctx).With("topic", topic).Info("message closed")
	case c.messge <- msg{
		header: msgHeader{
			ctx: ctx,
		},
		data: data,
	}:
	default:
		m.logger.WithContext(ctx).With("topic", topic).Warn("queue overflow, discard message")
	}
	return nil
}

func (m *Memory) Subscribe(ctx context.Context, topic Topic, handler func(ctx context.Context, data Message) error) error {
	if topic.Persistence() {
		return errors.New("memory queue can not persistence")
	}

	c := m.getChan(topic.Name(), true)

	for {
		select {
		case <-c.stop:
			m.logger.WithContext(ctx).With("topic", topic).Info("subscribe close")
			return nil
		case msg := <-c.messge:
			ctx = trace.Context(ctx, trace.TraceID(msg.header.ctx)...)

			err := handler(ctx, msg.data)
			if err != nil {
				m.logger.WithContext(ctx).WithErr(err).With("topic", topic).Warn("handler message failed")
			}
		}

	}
}

func (m *Memory) Close(topic Topic) {
	if topic.Persistence() {
		return
	}

	m.lock.Lock()
	defer m.lock.Unlock()

	c, ok := m.queue[topic.Name()]
	if !ok {
		return
	}

	close(c.stop)
	delete(m.queue, topic.Name())
}
