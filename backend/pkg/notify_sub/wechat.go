package notify_sub

import (
	"context"
	"fmt"
	"time"

	"github.com/silenceper/wechat/v2"
	"github.com/silenceper/wechat/v2/cache"
	"github.com/silenceper/wechat/v2/officialaccount"
	"github.com/silenceper/wechat/v2/officialaccount/config"
	"github.com/silenceper/wechat/v2/officialaccount/message"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
)

type wechatOfficialAccount struct {
	logger *glog.Logger

	in  NotifySubIn
	cfg model.MessageNotifySubInfo
	pc  model.AccessAddrCallback
	oa  *officialaccount.OfficialAccount
}

func NewWechatOfficialAccount(in NotifySubIn, cfg model.MessageNotifySubInfo, pc model.AccessAddrCallback) Sender {
	return &wechatOfficialAccount{
		logger: glog.Module("notify_sub", "wechat_official_account"),
		in:     in,
		cfg:    cfg,
		pc:     pc,
		oa: wechat.NewWechat().GetOfficialAccount(&config.Config{
			AppID:     cfg.ClientID,
			AppSecret: cfg.ClientSecret,
			Cache:     cache.NewMemcache(),
		}),
	}
}

func (w *wechatOfficialAccount) Send(ctx context.Context, userIDs model.Int64Array, notifyData model.MessageNotifyCommon) error {
	logger := w.logger.WithContext(ctx).With("user_ids", userIDs).With("notify_data", notifyData)
	logger.Info("send wechat_official_account notify_sub")

	title, op := notifyData.TitleOperateText()
	if title == "" {
		logger.Info("no wechat official account data, skip")
		return nil
	}

	var forum model.Forum
	if notifyData.ForumID > 0 {
		err := w.in.Forum.GetByID(ctx, &forum, notifyData.ForumID)
		if err != nil {
			logger.WithErr(err).Warn("get forum failed")
			return err
		}
	}

	publicAddr, _ := w.pc(ctx, fmt.Sprintf("/%s/%s", forum.RouteName, notifyData.DiscussUUID))
	return w.in.User.NotifySubBatchProcess(ctx, 20, func(uns []model.UserNotiySub) error {
		for _, un := range uns {
			msgID, err := w.oa.GetTemplate().Send(&message.TemplateMessage{
				ToUser:     un.ThirdID,
				TemplateID: w.cfg.TemplateID,
				URL:        publicAddr,
				Data: map[string]*message.TemplateDataItem{
					"thing2": {
						Value: title,
					},
					"thing3": {
						Value: op,
					},
					"thing24": {
						Value: notifyData.FromName,
					},
					"thing22": {
						Value: time.Now().Format(time.DateTime),
					},
				},
			})
			if err != nil {
				logger.WithErr(err).With("sub_info", un).Error("send notify message failed")
				continue
			}

			logger.With("sub_info", un).With("msg_id", msgID).Debug("notify user successfully")
		}

		return nil
	})
}
