package mq

import (
	"context"
	"time"
)

type Message interface{}

type Topic interface {
	Persistence() bool
	Name() string
}

type Handler[T Message] interface {
	Handle(ctx context.Context, msg T) error
	MsgType() T
	Topic() Topic
	Group() string
	AckWait() time.Duration
	Concurrent() uint
}

type Subscriber interface {
	Subscribe(ctx context.Context) error
	Close(ctx context.Context)
}

type SubscriberWithHandler interface {
	Subscribe(ctx context.Context, topic Topic, handler func(ctx context.Context, data Message) error) error
	Close(topic Topic)
}

type Publisher interface {
	Publish(ctx context.Context, topic Topic, data Message) error
}
