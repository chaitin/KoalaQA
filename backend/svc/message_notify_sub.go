package svc

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type MessageNotifySub struct {
	repoNotifySub *repo.MessageNotifySub
}

func newMessageNotifySub(s *repo.MessageNotifySub) *MessageNotifySub {
	return &MessageNotifySub{
		repoNotifySub: s,
	}
}

func (m *MessageNotifySub) List(ctx context.Context) (*model.ListRes[model.MessageNotifySub], error) {
	var res model.ListRes[model.MessageNotifySub]
	err := m.repoNotifySub.List(ctx, &res.Items, repo.QueryWithOrderBy("type ASC"))
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))

	return &res, nil
}

func (m *MessageNotifySub) FrontendList(ctx context.Context) (*model.ListRes[model.MessageNotifySub], error) {
	var res model.ListRes[model.MessageNotifySub]
	err := m.repoNotifySub.List(ctx, &res.Items,
		repo.QueryWithOrderBy("type ASC"),
		repo.QueryWithSelectColumn("type", "enabled"),
	)
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))

	return &res, nil
}

type MessageNotifySubCreateReq struct {
	Type    model.MessageNotifySubType `json:"type" binding:"required"`
	Enabled bool                       `json:"enabled"`
	Info    model.MessageNotifySubInfo `json:"info"`
}

func (m *MessageNotifySub) Upsert(ctx context.Context, req MessageNotifySubCreateReq) (uint, error) {
	switch req.Type {
	case model.MessageNotifySubTypeDingtalk:
		if req.Info.ClientID == "" || req.Info.ClientSecret == "" || req.Info.RobotCode == "" {
			return 0, errors.New("invalid cred")
		}
	default:
		return 0, errors.ErrUnsupported
	}
	sub := model.MessageNotifySub{
		Type:    req.Type,
		Enabled: req.Enabled,
		Info:    model.NewJSONB(req.Info),
	}
	err := m.repoNotifySub.Upsert(ctx, &sub)
	if err != nil {
		return 0, err
	}

	return sub.ID, nil
}

func init() {
	registerSvc(newMessageNotifySub)
}
