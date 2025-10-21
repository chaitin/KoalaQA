package mq

import (
	"context"
	"errors"
	"sync"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/trace"
	"github.com/google/uuid"
)

type msgHeader struct {
	ctx context.Context
}
type msg struct {
	header msgHeader
	data   Message
}

type memoryQueue struct {
	id     string
	messge chan msg
	stop   chan struct{}
}

type Memory struct {
	lock sync.Mutex

	logger    *glog.Logger
	idTopic   map[string]string
	queue     map[string]map[string]*memoryQueue
	queueSize int
}

func newMemory() *Memory {
	return &Memory{
		logger:    glog.Module("mq", "memory"),
		idTopic:   make(map[string]string),
		queue:     make(map[string]map[string]*memoryQueue),
		queueSize: 1000,
	}
}

func (m *Memory) getChan(key string) map[string]*memoryQueue {
	m.lock.Lock()
	defer m.lock.Unlock()

	c, ok := m.queue[key]
	if !ok {
		return nil
	}

	return c
}

func (m *Memory) createChan(key string) *memoryQueue {
	m.lock.Lock()
	defer m.lock.Unlock()

	queue := &memoryQueue{
		id:     uuid.NewString(),
		messge: make(chan msg, m.queueSize),
		stop:   make(chan struct{}),
	}

	c, ok := m.queue[key]
	if !ok {
		m.queue[key] = make(map[string]*memoryQueue)
	}

	c[queue.id] = queue
	m.idTopic[queue.id] = key

	return queue
}

func (m *Memory) Publish(ctx context.Context, topic Topic, data Message) error {
	if topic.Persistence() {
		return errors.New("memory queue can not persistence")
	}
	cm := m.getChan(topic.Name())
	if len(cm) == 0 {
		m.logger.WithContext(ctx).With("topic", topic).Debug("no subscriber, discard message")
		return nil
	}

	for _, c := range cm {
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
	}

	return nil
}

func (m *Memory) Subscribe(ctx context.Context, topic Topic, handler func(ctx context.Context, data Message) error) error {
	if topic.Persistence() {
		return errors.New("memory queue can not persistence")
	}

	c := m.createChan(topic.Name())

	for {
		select {
		case <-c.stop:
			m.logger.WithContext(ctx).With("topic", topic).Debug("subscribe close")
			return nil
		case <-ctx.Done():
			m.Close(c.id)
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

func (m *Memory) Close(id string) {
	m.lock.Lock()
	defer m.lock.Unlock()

	topic, ok := m.idTopic[id]
	if !ok {
		return
	}
	delete(m.idTopic, id)

	c, ok := m.queue[topic]
	if !ok {
		return
	}

	queue, ok := c[id]
	if !ok {
		return
	}

	close(queue.stop)
	delete(c, id)
	if len(c) == 0 {
		delete(m.queue, topic)
	}
}
