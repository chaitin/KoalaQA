package cron

import (
	"context"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type rankContribute struct {
	logger    *glog.Logger
	userPoint *repo.UserPointRecord
	svcBot    *svc.Bot
	repoRank  *repo.Rank
}

func (r *rankContribute) Period() string {
	return "0 0 0 * * MON"
}

func (r *rankContribute) Run() {
	r.logger.Info("updating contribute rank...")

	ctx := context.Background()

	botUserID, err := r.svcBot.GetUserID(ctx)
	if err != nil {
		r.logger.WithErr(err).Warn("get user bot id failed")
		return
	}

	now := time.Now()
	data, err := r.userPoint.UserPoints(ctx,
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("user_id", botUserID, repo.EqualOPNE),
		repo.QueryWithPagination(&model.Pagination{
			Size: 5,
		}),
	)
	if err != nil {
		r.logger.WithErr(err).Warn("get last week pont failed")
		return
	}

	ranks := make([]model.Rank, 0, 5)
	for _, v := range data {
		ranks = append(ranks, model.Rank{
			Type:    model.RankTypeContribute,
			ScoreID: strconv.FormatUint(uint64(v.UserID), 10),
			Score:   float64(v.Point),
		})
	}

	err = r.repoRank.Delete(ctx, repo.QueryWithEqual("type", model.RankTypeContribute))
	if err != nil {
		r.logger.WithErr(err).Warn("clear contribute failed")
		return
	}

	if len(ranks) > 0 {
		err = r.repoRank.BatchCreate(ctx, &ranks)
		if err != nil {
			r.logger.WithErr(err).Warn("create last week contribute rank failed")
			return
		}
	}

}

func newRankContribute(userPoint *repo.UserPointRecord, bot *svc.Bot, rank *repo.Rank) Task {
	return &rankContribute{
		logger:    glog.Module("cron", "rank_contribute"),
		userPoint: userPoint,
		svcBot:    bot,
		repoRank:  rank,
	}
}

func init() {
	register(newRankContribute)
}
