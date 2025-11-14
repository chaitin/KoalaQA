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

func (r *Rank) Contribute(ctx context.Context) (*model.ListRes[RankContributeItem], error) {
	var res model.ListRes[RankContributeItem]
	err := r.repoRank.ListContribute(ctx, &res.Items)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (r *Rank) UpdateContribute(ctx context.Context) error {
	return r.repoRank.RefresContribute(ctx)
}

func (r *Rank) AIInsight(ctx context.Context) ([]model.RankTimeGroup, error) {
	now := time.Now()
	return r.repoRank.GroupByTime(ctx, 3,
		repo.QueryWithEqual("type", model.RanTypeAIInsight),
		repo.QueryWithEqual("created_at", util.WeekZero(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekZero(now.AddDate(0, 0, -21)), repo.EqualOPGT),
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
