package svc

import (
	"context"
	"errors"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/notify_sub"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type messageNotifySubManagerIn struct {
	fx.In

	Lc         fx.Lifecycle
	PublicAddr *PublicAddress
	NotifySub  *repo.MessageNotifySub
	Forum      *repo.Forum
	User       *repo.User
}

type messageNotifySubManager struct {
	in messageNotifySubManagerIn

	lock sync.Mutex
	m    map[model.MessageNotifySubType]notify_sub.Sender
}

func (m *messageNotifySubManager) new(typ model.MessageNotifySubType, info model.MessageNotifySubInfo, pc model.AccessAddrCallback) (notify_sub.Sender, error) {
	switch typ {
	case model.MessageNotifySubTypeDingtalk:
		return notify_sub.NewDingtalk(notify_sub.NotifySubIn{
			Forum: m.in.Forum,
			User:  m.in.User,
		}, info, pc), nil
	case model.MessageNotifySubTypeWechatOfficialAccount:
		return notify_sub.NewWechatOfficialAccount(notify_sub.NotifySubIn{
			Forum: m.in.Forum,
			User:  m.in.User,
		}, info, pc), nil
	default:
		return nil, errors.ErrUnsupported
	}
}

func (m *messageNotifySubManager) Delete(typ model.MessageNotifySubType) {
	m.lock.Lock()
	defer m.lock.Unlock()

	delete(m.m, typ)
}

func (m *messageNotifySubManager) Upsert(notifySub model.MessageNotifySub) error {
	if !notifySub.Enabled {
		m.Delete(notifySub.Type)
		return nil
	}

	sender, err := m.new(notifySub.Type, notifySub.Info.Inner(), m.in.PublicAddr.Callback)
	if err != nil {
		return err
	}

	m.lock.Lock()
	defer m.lock.Unlock()

	m.m[notifySub.Type] = sender
	return nil
}

func (m *messageNotifySubManager) Send(ctx context.Context, userIDs model.Int64Array, notifyData model.MessageNotifyCommon) error {
	m.lock.Lock()
	defer m.lock.Unlock()

	for _, sender := range m.m {
		_ = sender.Send(ctx, userIDs, notifyData)
	}

	return nil
}

func (m *messageNotifySubManager) init(ctx context.Context) error {
	var notifySubs []model.MessageNotifySub
	err := m.in.NotifySub.List(ctx, &notifySubs, repo.QueryWithEqual("enabled", true))
	if err != nil {
		return err
	}

	for _, notifySub := range notifySubs {
		err = m.Upsert(notifySub)
		if err != nil {
			return err
		}
	}

	return nil
}

func newMessageNotifySubManager(in messageNotifySubManagerIn) *messageNotifySubManager {
	mgr := messageNotifySubManager{
		in:   in,
		m:    map[model.MessageNotifySubType]notify_sub.Sender{},
		lock: sync.Mutex{},
	}

	in.Lc.Append(fx.StartHook(mgr.init))

	return &mgr
}

type MessageNotifySub struct {
	repoNotifySub *repo.MessageNotifySub
	NotifySubMgr  *messageNotifySubManager
}

func newMessageNotifySub(s *repo.MessageNotifySub, notifySubMgr *messageNotifySubManager) *MessageNotifySub {
	return &MessageNotifySub{
		repoNotifySub: s,
		NotifySubMgr:  notifySubMgr,
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
	if req.Enabled {
		switch req.Type {
		case model.MessageNotifySubTypeWechatOfficialAccount:
			if req.Info.TemplateID == "" {
				return 0, errors.New("invalid template_id")
			}
			if req.Info.Token == "" {
				return 0, errors.New("empty token")
			}
			if req.Info.AESKey == "" {
				return 0, errors.New("empty aes_key")
			}
			fallthrough
		case model.MessageNotifySubTypeDingtalk:
			if req.Info.ClientID == "" || req.Info.ClientSecret == "" {
				return 0, errors.New("invalid cred")
			}
		default:
			return 0, errors.ErrUnsupported
		}
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

	err = m.NotifySubMgr.Upsert(sub)
	if err != nil {
		return 0, err
	}

	return sub.ID, nil
}

func init() {
	registerSvc(newMessageNotifySub)
	registerSvc(newMessageNotifySubManager)
}
