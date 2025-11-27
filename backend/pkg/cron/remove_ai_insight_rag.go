package cron

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type removeAIInsightRag struct {
	logger *glog.Logger

	repoRank  *repo.Rank
	repoForum *repo.Forum
	rag       rag.Service
}

func (i *removeAIInsightRag) Period() string {
	return "0 0 0 * * MON"
}

func (i *removeAIInsightRag) Run() {
	ctx := context.Background()
	now := time.Now()

	i.logger.Info("remove ai insight rag task begin...")

	var ranks []model.Rank
	err := i.repoRank.List(ctx, &ranks,
		repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.DayTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("foreign_id", 0, repo.EqualOPGT),
		repo.QueryWithEqual("rag_id", "", repo.EqualOPNE),
	)
	if err != nil {
		i.logger.WithErr(err).Warn("list rank failed")
		return
	}

	forumM := make(map[uint][]string)
	for _, rank := range ranks {
		if rank.RagID == "" {
			continue
		}
		forumM[rank.ForeignID] = append(forumM[rank.ForeignID], rank.RagID)
	}

	for forumID, ragIDs := range forumM {
		var forum model.Forum
		err = i.repoForum.GetByID(ctx, &forum, forumID)
		if err != nil {
			i.logger.WithErr(err).With("forum_id", forumID).Warn("get forum failed")
			continue
		}
		err = i.rag.DeleteRecords(ctx, forum.InsightDatasetID, ragIDs)
		if err != nil {
			i.logger.WithErr(err).With("dataset_id", forum.InsightDatasetID).With("rag_ids", ragIDs).
				Warn("delete rag records failed")
		}
	}

	err = i.repoRank.Delete(ctx,
		repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -21)), repo.EqualOPLT),
	)
	if err != nil {
		i.logger.WithErr(err).Warn("remove old ai insight failed")
	}

	err = i.repoRank.Update(ctx, map[string]any{
		"rag_id": "",
	}, repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.DayTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("rag_id", "", repo.EqualOPNE))
	if err != nil {
		i.logger.WithErr(err).Warn("remove old ai insight rag_id failed")
	}

	i.logger.Info("remove ai insight rag task done")
}

func newRemoveAIInsightRag(rank *repo.Rank, r rag.Service, forum *repo.Forum) Task {
	return &removeAIInsightRag{
		logger:    glog.Module("cron", "remove_ai_insight_rag"),
		repoRank:  rank,
		repoForum: forum,
		rag:       r,
	}
}

func init() {
	register(newRemoveAIInsightRag)
}
