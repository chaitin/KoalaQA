package cron

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type aiInsight struct {
	logger     *glog.Logger
	generator  *message.Generator
	svcWebhook *svc.Webhook
	repoRank   *repo.Rank
}

func (i *aiInsight) Period() string {
	return "0 0 9 * * MON"
}

func (i *aiInsight) Run() {
	ctx := context.Background()
	i.logger.Info("ai insight task begin...")

	now := time.Now()

	exist, err := i.repoRank.Exist(ctx,
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
	)
	if err != nil {
		i.logger.WithErr(err).Warn("get ai insight data failed")
		return
	}

	if !exist {
		i.logger.Info("last week does not have ai insight msg, skip send")
		return
	}

	msg, err := i.generator.AIInsight(ctx, message.TypeAIInsightKnowledgeGap)
	if err != nil {
		i.logger.WithErr(err).Warn("generate knowledge gap msg failed")
		return
	}

	err = i.svcWebhook.Send(ctx, msg)
	if err != nil {
		i.logger.WithErr(err).Warn("send knowledge gap msg failed")
	}
}

func newAIInsight(gen *message.Generator, webhook *svc.Webhook, rank *repo.Rank) Task {
	return &aiInsight{
		logger:     glog.Module("cron", "ai_insight"),
		generator:  gen,
		svcWebhook: webhook,
		repoRank:   rank,
	}
}

func init() {
	register(newAIInsight)
}
