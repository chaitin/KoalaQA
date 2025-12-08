package cron

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type aiInsightAnswer struct {
	logger *glog.Logger

	repoRank *repo.Rank
	svcDisc  *svc.Discussion
}

func (i *aiInsightAnswer) Period() string {
	return "0 0 9 * * MON"
}

func (i *aiInsightAnswer) Run() {
	ctx := context.Background()
	now := time.Now()

	i.logger.Info("ai insight answer task begin...")

	groups, err := i.repoRank.GroupByTime(ctx, 3,
		repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
	)
	if err != nil {
		i.logger.WithErr(err).Warn("get last week rank failed")
		return
	}

	for _, group := range groups {
		for _, item := range group.Items.Inner() {
			i.logger.With("item", item).Info("generate ai insight answer")
			content, err := i.svcDisc.KeywordAnswer(ctx, svc.DiscussionKeywordAnswerReq{
				ForumID: item.ForeignID,
				Keyword: item.SocreID,
			})
			if err != nil {
				i.logger.WithErr(err).Warn("ai keyword answer failed")
				continue
			}

			if content == "" {
				i.logger.With("item", item).Info("empty ai answer, skip update")
				continue
			}

			err = i.repoRank.Update(ctx, map[string]any{
				"extra":      content,
				"updated_at": time.Now(),
			},
				repo.QueryWithEqual("foreign_id", item.ForeignID),
				repo.QueryWithEqual("score_id", item.SocreID),
				repo.QueryWithEqual("type", model.RankTypeAIInsight),
			)
			if err != nil {
				i.logger.WithErr(err).Warn("update rank ai answer failed")
			}
		}
	}
}

func newAIInsightAnswer(disc *svc.Discussion, rank *repo.Rank) Task {
	return &aiInsightAnswer{
		logger:   glog.Module("cron", "ai_insight_answer"),
		svcDisc:  disc,
		repoRank: rank,
	}
}

func init() {
	register(newAIInsightAnswer)
}
