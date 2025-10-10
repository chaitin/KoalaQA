package mq

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"time"

	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/trace"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"go.uber.org/fx"
)

type natsJS struct {
	conn *nats.Conn
	js   nats.JetStreamContext
}

func newNatsJS(cfg config.Config) (*natsJS, error) {
	if cfg.MQ.NATS.URL == "" {
		return nil, errors.New("MQ_NATS_URL is required")
	}
	opts := []nats.Option{
		nats.Name("anydoc"),
	}

	if cfg.MQ.NATS.User != "" {
		opts = append(opts, nats.UserInfo(cfg.MQ.NATS.User, cfg.MQ.NATS.Password))
	}

	nc, err := nats.Connect(cfg.MQ.NATS.URL, opts...)
	if err != nil {
		return nil, err
	}

	js, err := nc.JetStream()
	if err != nil {
		return nil, err
	}

	return &natsJS{
		conn: nc,
		js:   js,
	}, nil
}

type natsSubscriberIn struct {
	fx.In

	JS       *natsJS
	Handlers []Handler[Message] `group:"mq_handler"`
}
type natsSubscriber struct {
	in     natsSubscriberIn
	logger *glog.Logger
}

func (ns *natsSubscriber) Subscribe(ctx context.Context) error {
	for _, h := range ns.in.Handlers {
		topic := h.Topic()
		ns.logger.WithContext(ctx).With("topic", topic).Info("begin subscribe")

		callback := func(msg *nats.Msg) {
			ctx := trace.Context(ctx, msg.Header.Values("X-Trace-ID")...)

			typ := reflect.TypeOf(h.MsgType())
			var val reflect.Value
			switch typ.Kind() {
			case reflect.Ptr:
				val = reflect.New(typ.Elem())
			case reflect.Struct:
				val = reflect.New(typ)
			default:
				ns.logger.WithContext(ctx).With("topic", topic).Error("unsupported message type: %v", typ)
				return
			}
			if err := json.Unmarshal(msg.Data, val.Interface()); err != nil {
				ns.logger.WithContext(ctx).WithErr(err).With("topic", msg.Subject).Error("unmarshal msg failed")
				return
			}
			var param Message
			switch typ.Kind() {
			case reflect.Struct:
				param = val.Elem().Interface()
			case reflect.Ptr:
				param = val.Interface()
			}
			if err := h.Handle(ctx, param); err != nil {
				metadata, _ := msg.Metadata()
				ns.logger.WithContext(ctx).WithErr(err).With("topic", msg.Subject).With("metadata", metadata).Error("handle msg failed, wait retry")
				msg.NakWithDelay(time.Second * 10)
				return
			}
			e := msg.Ack()
			if e != nil {
				ns.logger.WithContext(ctx).WithErr(e).With("topic", msg.Subject).Error("ack msg failed")
				return
			}
		}

		for range h.Concurrent() {
			if topic.Persistence() {
				_, err := ns.in.JS.js.QueueSubscribe(topic.Name(), h.Group(), callback,
					nats.AckExplicit(),
					nats.MaxDeliver(3),
					nats.DeliverAll(),
					nats.AckWait(h.AckWait()),
					nats.Durable(h.Group()),
					nats.ConsumerName(h.Group()),
				)
				if err != nil {
					return err
				}
			} else {
				_, err := ns.in.JS.conn.QueueSubscribe(topic.Name(), h.Group(), callback)
				if err != nil {
					return err
				}
			}
			ns.logger.WithContext(ctx).With("topic", topic).Debug("subscribe successfully")
		}
	}
	return nil
}

func (ns *natsSubscriber) Close(ctx context.Context) {
	ns.in.JS.conn.Close()
}

func newNatsSubscriber(in natsSubscriberIn) (Subscriber, error) {
	return &natsSubscriber{
		in:     in,
		logger: glog.Module("mq", "nats", "subscriber"),
	}, nil
}

type natsPublisher struct {
	*natsJS
	logger *glog.Logger
}

func (np *natsPublisher) Publish(ctx context.Context, topic Topic, data Message) (err error) {
	var raw []byte
	if m, ok := data.(json.Marshaler); ok {
		raw, err = m.MarshalJSON()
		if err != nil {
			return err
		}
	} else {
		raw, err = json.Marshal(data)
		if err != nil {
			return err
		}
	}
	np.logger.WithContext(ctx).With("topic", topic).With("data", string(raw)).Debug("publish msg")

	msg := nats.NewMsg(topic.Name())
	msg.Header["X-Trace-ID"] = trace.TraceID(ctx)
	msg.Data = raw

	if topic.Persistence() {
		_, err = np.js.PublishMsgAsync(msg)
	} else {
		err = np.conn.PublishMsg(msg)
	}

	if err != nil {
		np.logger.WithContext(ctx).WithErr(err).With("topic", topic).Error("publish msg failed")
		return err
	}
	np.logger.WithContext(ctx).With("topic", topic).Debug("publish msg successfully")
	return nil
}

func newNatsPublisher(js *natsJS) (Publisher, error) {
	return &natsPublisher{
		natsJS: js,
		logger: glog.Module("mq", "nats", "publisher"),
	}, nil
}

var natsModule = fx.Options(
	fx.Provide(newNatsJS),
	fx.Provide(newNatsPublisher),
	fx.Provide(newNatsSubscriber),
	fx.Invoke(func(lc fx.Lifecycle, cfg config.Config, inJS *natsJS, subscriber Subscriber) error {
		js, err := jetstream.New(inJS.conn)
		if err != nil {
			return err
		}

		for stream, subjects := range cfg.MQ.NATS.Streams {
			if subjects == "" || stream == "" {
				glog.With("stream", stream).With("subjects", subjects).Warn("empty subjects or stream, skip")
				continue
			}
			glog.With("stream", stream).With("subjects", subjects).With("max_age", cfg.MQ.NATS.MsgMaxAge).Debug("upsert stream")
			_, err = js.CreateOrUpdateStream(context.Background(), jetstream.StreamConfig{
				Name:     stream,
				Subjects: strings.Split(subjects, "|"),
				MaxAge:   time.Duration(cfg.MQ.NATS.MsgMaxAge) * time.Second,
			})
			if err != nil {
				return err
			}
		}

		lc.Append(fx.Hook{
			OnStart: func(ctx context.Context) error {
				return subscriber.Subscribe(ctx)
			},
			OnStop: func(ctx context.Context) error {
				subscriber.Close(ctx)
				return nil
			},
		})
		return nil
	}),
)

func AsSubscriber(s any) any {
	return fx.Annotate(
		s,
		fx.As(new(Handler[Message])),
		fx.ResultTags(`group:"mq_handler"`),
	)
}
