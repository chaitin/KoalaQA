package svc

import (
	"context"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/webhook"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type Webhook struct {
	logger   *glog.Logger
	lock     sync.Mutex
	webhooks map[uint]webhook.Webhook

	repoWebhook *repo.Webhook
}

func (w *Webhook) setWebhook(id uint, webhook webhook.Webhook) {
	w.lock.Lock()
	defer w.lock.Unlock()

	if webhook == nil {
		delete(w.webhooks, id)
		return
	}

	w.webhooks[id] = webhook
}

func (w *Webhook) List(ctx context.Context) (*model.ListRes[model.Webhook], error) {
	var res model.ListRes[model.Webhook]
	err := w.repoWebhook.List(ctx, &res.Items)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type WebhookCreateReq struct {
	Name string `json:"name" binding:"required"`
	model.WebhookConfig
}

func (w *Webhook) Create(ctx context.Context, req WebhookCreateReq) (uint, error) {
	hook, err := webhook.New(req.WebhookConfig)
	if err != nil {
		return 0, err
	}

	webhook := model.Webhook{
		Name: req.Name,
		WebhookConfig: model.WebhookConfig{
			Type:     req.Type,
			URL:      req.URL,
			Sign:     req.Sign,
			MsgTypes: req.MsgTypes,
		},
	}
	err = w.repoWebhook.Create(ctx, &webhook)
	if err != nil {
		return 0, err
	}

	w.setWebhook(webhook.ID, hook)
	return webhook.ID, nil
}

type WebhookUpdateReq struct {
	Name string `json:"name" binding:"required"`
	model.WebhookConfig
}

func (w *Webhook) Update(ctx context.Context, id uint, req WebhookUpdateReq) error {
	hook, err := webhook.New(req.WebhookConfig)
	if err != nil {
		return err
	}

	err = w.repoWebhook.Update(ctx, map[string]any{
		"updated_at": time.Now(),
		"name":       req.Name,
		"type":       req.Type,
		"url":        req.URL,
		"sign":       req.Sign,
		"msg_types":  req.MsgTypes,
	}, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	w.setWebhook(id, hook)

	return nil
}

func (w *Webhook) Get(ctx context.Context, id uint) (*model.Webhook, error) {
	var hook model.Webhook
	err := w.repoWebhook.GetByID(ctx, &hook, id)
	if err != nil {
		return nil, err
	}
	hook.Sign = ""

	return &hook, nil
}

func (w *Webhook) Delete(ctx context.Context, id uint) error {
	err := w.repoWebhook.Delete(ctx, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	w.setWebhook(id, nil)
	return nil
}

func (w *Webhook) Send(ctx context.Context, msg message.Message) error {
	for id, hook := range w.webhooks {
		err := hook.Send(ctx, msg)
		if err != nil {
			w.logger.WithContext(ctx).WithErr(err).With("id", id).Warn("send webhook failed")
		}
	}

	return nil
}

func newWebhook(lc fx.Lifecycle, repoWebhook *repo.Webhook) *Webhook {
	w := &Webhook{
		logger:      glog.Module("svc", "webhook"),
		repoWebhook: repoWebhook,
		webhooks:    make(map[uint]webhook.Webhook),
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			webhooks, err := w.List(ctx)
			if err != nil {
				return err
			}
			for _, dbHook := range webhooks.Items {
				hook, err := webhook.New(dbHook.WebhookConfig)
				if err != nil {
					return err
				}

				w.setWebhook(dbHook.ID, hook)
			}

			return nil
		},
	})

	return w
}

func init() {
	registerSvc(newWebhook)
}
