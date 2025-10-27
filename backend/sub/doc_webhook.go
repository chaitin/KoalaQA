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

type docWebhookIn struct {
	fx.In

	Generator  *message.Generator
	SvcWebhook *svc.Webhook
}

type docWebhook struct {
	logger *glog.Logger

	in docWebhookIn
}

func (d *docWebhook) MsgType() mq.Message {
	return topic.MsgDocWebhook{}
}

func (d *docWebhook) Topic() mq.Topic {
	return topic.TopicDocWebhook
}

func (d *docWebhook) Group() string {
	return "koala_doc_webhook"
}

func (d *docWebhook) AckWait() time.Duration {
	return time.Minute * 2
}

func (d *docWebhook) Concurrent() uint {
	return 2
}

func (d *docWebhook) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDocWebhook)

	logger := d.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive doc webhook msg")

	webhookMsg, err := d.in.Generator.Doc(ctx, data.MsgType, data.KBID, data.DocID)
	if err != nil {
		logger.WithErr(err).Warn("generate doc webhook msg failed")
		return nil
	}

	err = d.in.SvcWebhook.Send(ctx, webhookMsg)
	if err != nil {
		logger.WithErr(err).Warn("send doc webhook msg failed")
	}

	return nil
}

func newDocWebhook(in docWebhookIn) *docWebhook {
	return &docWebhook{
		logger: glog.Module("sub", "doc_webhook"),
		in:     in,
	}
}
