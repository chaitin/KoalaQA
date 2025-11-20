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

type closeDiscussion struct {
	logger     *glog.Logger
	repoDisc   *repo.Discussion
	svcSysDisc *svc.SystemDiscussion
}

func (c *closeDiscussion) Period() string {
	return "0 10 0 * *"
}

func (c *closeDiscussion) Run() {
	c.logger.Info("closing expired discussion...")
	ctx := context.Background()

	sysDisc, err := c.svcSysDisc.Get(ctx)
	if err != nil {
		c.logger.WithErr(err).Warn("get system discussion failed")
		return
	}

	if sysDisc.AutoClose == 0 {
		c.logger.Info("discussion auto close disabled, skip")
		return
	}

	intAutoClose := int(sysDisc.AutoClose)
	if intAutoClose < 0 {
		c.logger.Info("invalid auto close value, skip")
		return
	}

	err = c.repoDisc.Update(ctx, map[string]any{
		"resolved":    model.DiscussionStateClosed,
		"resolved_at": time.Now(),
	}, repo.QueryWithEqual("resolved", model.DiscussionStateNone),
		repo.QueryWithEqual("created_at", util.DayTrunc(time.Now().AddDate(0, 0, -intAutoClose)), repo.EqualOPLT),
	)
	if err != nil {
		c.logger.WithErr(err).With("day_before", sysDisc.AutoClose).Warn("close disc failed")
		return
	}
}

func newCloseDiscussion(disc *repo.Discussion, sysDisc *svc.SystemDiscussion) Task {
	return &closeDiscussion{
		logger:     glog.Module("cron", "close_discussion"),
		repoDisc:   disc,
		svcSysDisc: sysDisc,
	}
}

func init() {
	register(newCloseDiscussion)
}
