package webhook

import (
	"context"
	"fmt"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
)

type Webhook interface {
	Send(ctx context.Context, msg message.Message) error
}

func New(cfg model.WebhookConfig) (Webhook, error) {
	switch cfg.Type {
	case model.WebhookTypeDingtalk:
		return newDingtalk(cfg.URL, cfg.Sign, cfg.MsgTypes)
	case model.WebhookTypeHTTP:
		return newHttpHook(cfg.URL, cfg.Sign, cfg.MsgTypes)
	default:
		return nil, fmt.Errorf("webhook type %d not support", cfg.Type)
	}
}
