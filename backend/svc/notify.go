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

func (mn *MessageNotify) ListNotifyInfo(ctx context.Context, userID uint) ([]model.MessageNotifyInfo, error) {
	var res []model.MessageNotifyInfo
	err := mn.repoMN.List(ctx, &res, repo.QueryWithEqual("user_id", userID), repo.QueryWithEqual("read", false))
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (mn *MessageNotify) UnreadTotal(ctx context.Context, userID uint) (int64, error) {
	var unread int64
	err := mn.repoMN.Count(ctx, &unread, repo.QueryWithEqual("user_id", userID), repo.QueryWithEqual("read", false))
	if err != nil {
		return 0, err
	}

	return unread, nil
}

func (mn *MessageNotify) Read(ctx context.Context, userID uint, id uint) error {
	return mn.repoMN.Update(ctx, map[string]any{
		"read":       true,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", id), repo.QueryWithEqual("user_id", userID))
}

func init() {
	registerSvc(newMessageNotify)
}
