package svc

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type MessageNotify struct {
	repoMN *repo.MessageNotify
}

func newMessageNotify(mn *repo.MessageNotify) *MessageNotify {
	return &MessageNotify{
		repoMN: mn,
	}
}

type ListNotifyInfoReq struct {
	*model.Pagination

	Read *bool `form:"read"`
}

func (mn *MessageNotify) ListNotifyInfo(ctx context.Context, userID uint, req ListNotifyInfoReq) (*model.ListRes[model.MessageNotifyInfo], error) {
	var res model.ListRes[model.MessageNotifyInfo]
	err := mn.repoMN.List(ctx, &res.Items,
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithEqual("read", req.Read),
		repo.QueryWithPagination(req.Pagination),
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
