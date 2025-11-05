package cron

import (
	"context"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/svc"
)

type rankContribute struct {
	logger  *glog.Logger
	svcRank *svc.Rank
}

func (r *rankContribute) Period() string {
	return "0 0 0 * * MON"
}

func (r *rankContribute) Run() {
	r.logger.Info("updating contribute rank...")
	err := r.svcRank.UpdateContribute(context.Background())
	if err != nil {
		r.logger.WithErr(err).Warn("update contribute rank failed")
	}
}

func newRankContribute(rank *svc.Rank) Task {
	return &rankContribute{
		logger:  glog.Module("cron", "rank_contribute"),
		svcRank: rank,
	}
}

func init() {
	register(newRankContribute)
}
