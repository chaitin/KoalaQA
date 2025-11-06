package svc

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type MessageNotify struct {
	repoMN  *repo.MessageNotify
	repoSys *repo.System
}

func newMessageNotify(mn *repo.MessageNotify, sys *repo.System) *MessageNotify {
	return &MessageNotify{
		repoMN:  mn,
		repoSys: sys,
	}
}

type ListNotifyInfoReq struct {
	*model.Pagination

	Read *bool `form:"read"`
}

func (mn *MessageNotify) ListNotifyInfo(ctx context.Context, userID uint, req ListNotifyInfoReq, orderBy string) (*model.ListRes[model.MessageNotify], error) {
	var res model.ListRes[model.MessageNotify]
	err := mn.repoMN.List(ctx, &res.Items,
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithEqual("read", req.Read),
		repo.QueryWithPagination(req.Pagination),
		repo.QueryWithOrderBy(orderBy),
	)
	if err != nil {
		return nil, err
	}

	err = mn.repoMN.Count(ctx, &res.Total,
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithEqual("read", req.Read),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (mn *MessageNotify) UnreadTotal(ctx context.Context, userID uint) (int64, error) {
	var unread int64
	err := mn.repoMN.Count(ctx, &unread, repo.QueryWithEqual("user_id", userID), repo.QueryWithEqual("read", false))
	if err != nil {
		return 0, err
	}

	return unread, nil
}

type NotifyReadReq struct {
	ID uint
}

func (mn *MessageNotify) Read(ctx context.Context, userID uint, req NotifyReadReq) error {
	queryFuncs := []repo.QueryOptFunc{
		repo.QueryWithEqual("user_id", userID),
	}

	if req.ID > 0 {
		queryFuncs = append(queryFuncs, repo.QueryWithEqual("id", req.ID))
	}

	return mn.repoMN.Update(ctx, map[string]any{
		"read":       true,
		"updated_at": time.Now(),
	}, queryFuncs...)
}

func init() {
	registerSvc(newMessageNotify)
}
