package cron

import (
	"context"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/repo"
)

type removeDiscussionTag struct {
	logger      *glog.Logger
	repoDiscTag *repo.DiscussionTag
}

func (r *removeDiscussionTag) Period() string {
	return "0 0 1 * * MON"
}

func (r *removeDiscussionTag) Run() {
	r.logger.Info("remove discussion zero tag begin...")

	err := r.repoDiscTag.Delete(context.Background(), repo.QueryWithEqual("count", 1, repo.EqualOPLT))
	if err != nil {
		r.logger.WithErr(err).Warn("remove zero count discussion tag failed")
		return
	}
}

func newDiscussionTag(discTag *repo.DiscussionTag) Task {
	return &removeDiscussionTag{
		logger:      glog.Module("cron", "remove_discussion_tag"),
		repoDiscTag: discTag,
	}
}

func init() {
	register(newDiscussionTag)
}
