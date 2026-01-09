package sub

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
	"go.uber.org/fx"
)

type messageNotifyIn struct {
	fx.In

	Bot        *svc.Bot
	Disc       *svc.Discussion
	PublicAddr *svc.PublicAddress
	DiscFollow *repo.DiscussionFollow
	User       *repo.User
	Mn         *repo.MessageNotify
	Comment    *repo.Comment
	Pub        mq.Publisher `name:"memory_mq"`
	NatsPub    mq.Publisher
	Forum      *repo.Forum
	NotifySub  *repo.MessageNotifySub
}
type messageNotify struct {
	logger     *glog.Logger
	bot        *svc.Bot
	disc       *svc.Discussion
	publicAddr *svc.PublicAddress
	notifySub  *repo.MessageNotifySub
	discFollow *repo.DiscussionFollow
	user       *repo.User
	comment    *repo.Comment
	forum      *repo.Forum
	mn         *repo.MessageNotify
	pub        mq.Publisher
	natsPub    mq.Publisher
}

func newMessageNotify(in messageNotifyIn) *messageNotify {
	return &messageNotify{
		logger:     glog.Module("sub", "message_notify"),
		bot:        in.Bot,
		user:       in.User,
		comment:    in.Comment,
		mn:         in.Mn,
		disc:       in.Disc,
		pub:        in.Pub,
		natsPub:    in.NatsPub,
		discFollow: in.DiscFollow,
		forum:      in.Forum,
		notifySub:  in.NotifySub,
		publicAddr: in.PublicAddr,
	}
}

func (mn *messageNotify) MsgType() mq.Message {
	return topic.MsgMessageNotify{}
}

func (mn *messageNotify) Topic() mq.Topic {
	return topic.TopicMessageNotify
}

func (mn *messageNotify) Group() string {
	return "koala_message_notify"
}

func (mn *messageNotify) AckWait() time.Duration {
	return time.Minute * 1
}

func (mn *messageNotify) Concurrent() uint {
	return 1
}

func (mn *messageNotify) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgMessageNotify)

	logger := mn.logger.WithContext(ctx).With("msg", data)
	botUserID, err := mn.bot.GetUserID(ctx)
	if err != nil {
		logger.WithErr(err).Warn("notify get bot user id failed")
		return nil
	}

	if data.FromID == data.ToID || (data.FromID == 0 && data.Type != model.MsgNotifyTypeUserPoint) ||
		(data.ToID == botUserID && !slices.Contains([]model.MsgNotifyType{model.MsgNotifyTypeDislikeComment, model.MsgNotifyTypeBotUnknown}, data.Type)) {
		logger.With("msg", data).With("bot_user_id", botUserID).Debug("ignore message notify")
		return nil
	}

	var fromUser model.User
	if data.FromID > 0 {
		err = mn.user.GetByID(ctx, &fromUser, data.FromID)
		if err != nil {
			logger.WithErr(err).Warn("get from user failed")
			return nil
		}
	}

	var toUser model.User
	if data.ToID > 0 {
		err = mn.user.GetByID(ctx, &toUser, data.ToID)
		if err != nil {
			logger.WithErr(err).Warn("get to user failed")
			return nil
		}
	}

	var (
		topics          = make(map[uint]mq.Topic)
		dbMessageNotify []model.MessageNotify
	)

	var parentComment string
	if data.ParentID != 0 {
		err = mn.comment.GetByID(ctx, &parentComment, data.ParentID, repo.QueryWithSelectColumn("content"))
		if err != nil {
			logger.WithErr(err).Warn("get parent comment failed")
		}
	}

	common := model.MessageNotifyCommon{
		DiscussHeader:    data.DiscussHeader,
		UserReviewHeader: data.UserReviewHeader,
		CommentHeader: model.CommentHeader{
			ParentComment: util.TruncateString(parentComment, 50),
		},
		UserPointHeader: data.UserPointHeader,
		Type:            data.Type,
		FromID:          data.FromID,
		FromName:        fromUser.Name,
		FromBot:         data.FromID == botUserID,
		ToID:            data.ToID,
		ToName:          toUser.Name,
		ToBot:           data.ToID == botUserID,
	}

	if data.ToID == botUserID {
		switch data.Type {
		case model.MsgNotifyTypeDislikeComment:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeDislikeBotComment,
				UserID:    data.FromID,
				DiscussID: data.DiscussID,
			})
			if err != nil {
				logger.WithErr(err).Warn("send webhook message failed")
			}

			return nil
		case model.MsgNotifyTypeBotUnknown:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeBotUnknown,
				UserID:    data.FromID,
				DiscussID: data.DiscussID,
			})
			if err != nil {
				logger.WithErr(err).Warn("send webhook message failed")
			}

			return nil
		case model.MsgNotifyTypeUserPoint:
			// 用户获得积分，机器人不需要通知到管理员
			return nil
		}

		var users []model.User
		err = mn.user.List(ctx, &users, repo.QueryWithEqual("role", model.UserRoleAdmin))
		if err != nil {
			logger.WithErr(err).Warn("notify get admin user failed")
			return nil
		}

		for _, user := range users {
			if user.ID == data.FromID {
				continue
			}

			dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
				UserID:              user.ID,
				MessageNotifyCommon: common,
				Read:                false,
			})

			topics[user.ID] = topic.NewMessageNotifyUser(user.ID)
		}
	} else if data.ToID == 0 {
		switch data.Type {
		case model.MsgNotifyTypeIssueInProgress, model.MsgNotifyTypeIssueResolved:
			userIDs, err := mn.discFollow.ListUserID(ctx, data.DiscussID)
			if err != nil {
				logger.WithErr(err).Warn("get disc follow user id failed")
				return nil
			}

			for _, userID := range userIDs {
				dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
					UserID:              userID,
					MessageNotifyCommon: common,
					Read:                false,
				})

				topics[userID] = topic.NewMessageNotifyUser(userID)
			}
		default:
			logger.Warn("invalid msg type, ignore")
			return nil
		}
	} else {
		switch data.Type {
		case model.MsgNotifyTypeApplyComment:
			if fromUser.Role == model.UserRoleAdmin {
				// 管理员采纳需要通知原帖帖主，机器人不需要通知
				if common.ToBot {
					logger.Info("admin apply bot comment, skip send notify")
					return nil
				}

				disc, err := mn.disc.GetByID(ctx, data.DiscussID)
				if err != nil {
					logger.WithErr(err).Warn("get discussion failed, skip notify discuss user")
				} else if disc.UserID != fromUser.ID {
					c := common
					var discUser model.User
					err := mn.user.GetByID(ctx, &discUser, disc.UserID)
					if err != nil {
						logger.WithErr(err).With("user_id", disc.UserID).Warn("get disc user info failed, skip notify disc user")
					} else {
						c.Type = model.MsgNotifyTypeResolveByAdmin
						c.ToID = disc.UserID
						c.ToName = discUser.Name
						c.ToBot = false
						dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
							UserID:              disc.UserID,
							MessageNotifyCommon: c,
							Read:                false,
						})

						topics[disc.UserID] = topic.NewMessageNotifyUser(disc.UserID)
					}

				}

			}
		}

		dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
			UserID:              data.ToID,
			MessageNotifyCommon: common,
			Read:                false,
		})

		topics[data.ToID] = topic.NewMessageNotifyUser(data.ToID)
	}

	err = mn.mn.BatchCreate(ctx, dbMessageNotify...)
	if err != nil {
		logger.WithErr(err).Warn("batch create notify failed")
		return nil
	}

	userIDExist := make(map[uint]bool)
	userIDs := make(model.Int64Array, 0)
	for _, notify := range dbMessageNotify {
		topic, ok := topics[notify.UserID]
		if !ok {
			logger.With("notify", notify.UserID).Warn("can not find topic to notify, skip")
			continue
		}

		if !userIDExist[notify.UserID] {
			userIDs = append(userIDs, int64(notify.UserID))
			userIDExist[notify.UserID] = true
		}

		err = mn.pub.Publish(ctx, topic, model.MessageNotifyInfo{
			ID:                  notify.ID,
			MessageNotifyCommon: notify.MessageNotifyCommon,
		})
		if err != nil {
			logger.WithErr(err).With("topic", topic).Warn("publish msg failed")
		}
	}

	mn.sendNotifySub(ctx, logger, common, userIDs)

	return nil
}

func (mn *messageNotify) sendNotifySub(ctx context.Context, logger *glog.Logger, notifyData model.MessageNotifyCommon, userIDs model.Int64Array) {
	var notifySubs []model.MessageNotifySub
	err := mn.notifySub.List(ctx, &notifySubs, repo.QueryWithEqual("enabled", true))
	if err != nil {
		logger.WithErr(err).Warn("list db notify sub failed")
		return
	}

	var forum model.Forum
	err = mn.forum.GetByID(ctx, &forum, notifyData.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return
	}

	publicAddr, err := mn.publicAddr.Get(ctx)
	if err != nil {
		logger.WithErr(err).Warn("get public addr failed")
		return
	}

	for _, notifySub := range notifySubs {
		switch notifySub.Type {
		case model.MessageNotifySubTypeDingtalk:
			data := notifyData.Dingtalk(publicAddr, forum)
			if data == nil {
				logger.Info("no dingtalk data, skip")
				continue
			}
			err = mn.sendNotifySubDingtalk(ctx, logger, notifySub.Info.Inner(), data, userIDs)
			if err != nil {
				logger.WithErr(err).Warn("send dingtalk notify_sub failed")
			}
		}
	}
}

func (mn *messageNotify) sendNotifySubDingtalk(ctx context.Context, logger *glog.Logger, subInfo model.MessageNotifySubInfo, notifyData *model.MessageNotifyDingtalk, userIDs model.Int64Array) error {
	accessToken, err := mn.getDingtalkAccessToken(ctx, subInfo)
	if err != nil {
		logger.WithErr(err).Warn("get dingtalk access token failed")
		return err
	}

	return mn.user.NotifySubBatchProcess(ctx, 20, func(uns []model.UserNotiySub) error {
		thirdIDs := make([]string, len(uns))
		for i, v := range uns {
			thirdIDs[i] = v.ThirdID
		}

		paramBytes, err := json.Marshal(notifyData)
		if err != nil {
			return err
		}

		reqBytes, err := json.Marshal(map[string]any{
			"robotCode": subInfo.ClientID,
			"userIds":   thirdIDs,
			"msgKey":    "sampleActionCard",
			"msgParam":  string(paramBytes),
		})

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend", bytes.NewReader(reqBytes))
		if err != nil {
			logger.WithErr(err).Warn("new dingtalk notify sub req failed")
			return nil
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-acs-dingtalk-access-token", accessToken)

		resp, err := util.HTTPClient.Do(req)
		if err != nil {
			logger.WithErr(err).Warn("do dingtalk notify sub req failed")
			return nil
		}
		defer resp.Body.Close()

		io.Copy(io.Discard, resp.Body)

		if resp.StatusCode != http.StatusOK {
			logger.With("status_code", resp.StatusCode).Warn("send dingtalk notify sub status code abnormal")
			return nil
		}

		return nil
	},
		repo.QueryWithEqual("user_id", userIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("type", model.MessageNotifySubTypeDingtalk))
}

func (mn *messageNotify) getDingtalkAccessToken(ctx context.Context, sub model.MessageNotifySubInfo) (string, error) {
	reqBytes, err := json.Marshal(map[string]string{
		"appKey":    sub.ClientID,
		"appSecret": sub.ClientSecret,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.dingtalk.com/v1.0/oauth2/accessToken", bytes.NewReader(reqBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("get access token status code: %d", resp.StatusCode)
	}

	var res struct {
		AccessToken string `json:"accessToken"`
		ExpireIn    int    `json:"expireIn"`
	}
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return "", err
	}

	if res.AccessToken == "" {
		return "", errors.New("empty access token")
	}

	return res.AccessToken, nil
}
