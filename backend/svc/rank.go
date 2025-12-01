package svc

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type Rank struct {
	repoRank *repo.Rank
}

type RankContributeItem struct {
	ID     uint    `json:"id"`
	Name   string  `json:"name"`
	Avatar string  `json:"avatar"`
	Score  float64 `json:"score"`
}

type ListContributeReq struct {
	Type model.RankType `form:"type" binding:"required,oneof=1 3"`
}

func (r *Rank) Contribute(ctx context.Context, req ListContributeReq) (*model.ListRes[RankContributeItem], error) {
	var res model.ListRes[RankContributeItem]
	err := r.repoRank.ListContribute(ctx, &res.Items, req.Type)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type UpdateContributeReq struct {
	Type model.RankType
}

func (r *Rank) UpdateContribute(ctx context.Context, req UpdateContributeReq) error {
	return r.repoRank.RefresContribute(ctx, req.Type)
}

func (r *Rank) AIInsight(ctx context.Context) ([]model.RankTimeGroup, error) {
	now := time.Now()
	return r.repoRank.GroupByTime(ctx, 3,
		repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -21)), repo.EqualOPGTE),
	)
}

func newRank(r *repo.Rank) *Rank {
	return &Rank{
		repoRank: r,
	}
}

func init() {
	registerSvc(newRank)
}
