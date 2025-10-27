package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/svc"
	"go.uber.org/fx"
)

type discussWebhookIn struct {
	fx.In

	Generator  *message.Generator
	SvcWebhook *svc.Webhook
}

type discussWebhook struct {
	logger *glog.Logger

	in discussWebhookIn
}

func (d *discussWebhook) MsgType() mq.Message {
	return topic.MsgDiscussWebhook{}
}

func (d *discussWebhook) Topic() mq.Topic {
	return topic.TopicDiscussWebhook
}

func (d *discussWebhook) Group() string {
	return "koala_discuss_webhook"
}

func (d *discussWebhook) AckWait() time.Duration {
	return time.Minute * 2
}

func (d *discussWebhook) Concurrent() uint {
	return 5
}

func (d *discussWebhook) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscussWebhook)
	logger := d.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive discuss webhook msg")

	webhookMsg, err := d.in.Generator.Discuss(ctx, data.MsgType, data.DiscussID, data.UserID)
	if err != nil {
		logger.WithErr(err).Warn("generate discuss webhook message failed")
		return nil
	}

	err = d.in.SvcWebhook.Send(ctx, webhookMsg)
	if err != nil {
		logger.WithErr(err).Warn("send discuss webhook msg failed")
	}

	return nil
}

func newDiscussWebhook(in discussWebhookIn) *discussWebhook {
	return &discussWebhook{
		logger: glog.Module("sub", "discuss_webhook"),
		in:     in,
	}
}
