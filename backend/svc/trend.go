package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Trend struct {
	svcUser   *User
	repoTrend *repo.Trend
}

type TrendListReq struct {
	*model.Pagination

	UserID uint `form:"user_id" binding:"required"`
}

func (t *Trend) List(ctx context.Context, curUserID uint, req TrendListReq) (*model.ListRes[model.Trend], error) {
	var res model.ListRes[model.Trend]
	curUserForumIDs, err := t.svcUser.ForumIDs(ctx, curUserID)
	if err != nil {
		return nil, err
	}
	if len(curUserForumIDs) == 0 {
		return &res, nil
	}

	err = t.repoTrend.List(ctx, &res.Items,
		repo.QueryWithEqual("user_id", req.UserID),
		repo.QueryWithPagination(req.Pagination),
		repo.QueryWithEqual("forum_id", curUserForumIDs, repo.EqualOPEqAny),
		repo.QueryWithOrderBy("created_at DESC, id DESC"),
	)
	if err != nil {
		return nil, err
	}

	err = t.repoTrend.Count(ctx, &res.Total,
		repo.QueryWithEqual("user_id", req.UserID),
		repo.QueryWithEqual("forum_id", curUserForumIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (t *Trend) Create(ctx context.Context, trend *model.Trend) error {
	return t.repoTrend.Create(ctx, trend)
}

func newTrend(t *repo.Trend, u *User) *Trend {
	return &Trend{
		svcUser:   u,
		repoTrend: t,
	}
}

func init() {
	registerSvc(newTrend)
}
