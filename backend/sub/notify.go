package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type messageNotify struct {
	logger  *glog.Logger
	bot     *svc.Bot
	user    *repo.User
	mn      *repo.MessageNotify
	pub     mq.Publisher `name:"memory_mq"`
	natsPub mq.Publisher
}

func newMessageNotify(bot *svc.Bot, user *repo.User, mn *repo.MessageNotify, pub mq.Publisher, natsPub mq.Publisher) *messageNotify {
	return &messageNotify{
		logger:  glog.Module("sub", "message_notify"),
		bot:     bot,
		user:    user,
		mn:      mn,
		pub:     pub,
		natsPub: natsPub,
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

	if data.Type == model.MsgNotifyTypeLikeComment && data.ToID == botUserID {
		return nil
	}

	var fromUser model.User
	err = mn.user.GetByID(ctx, &fromUser, data.FromID)
	if err != nil {
		return err
	}

	var toUser model.User
	err = mn.user.GetByID(ctx, &toUser, data.FromID)
	if err != nil {
		return err
	}

	var (
		topics          = make(map[uint]mq.Topic)
		dbMessageNotify []model.MessageNotify
	)

	common := model.MessageNotifyCommon{
		DiscussID:    data.DiscussID,
		DiscussUUID:  data.DiscussUUID,
		DiscussTitle: data.DiscussTitle,
		Type:         data.Type,
		FromID:       data.FromID,
		FromName:     fromUser.Name,
		FromBot:      data.FromID == botUserID,
		ToID:         data.ToID,
		ToName:       toUser.Name,
		ToBot:        data.ToID == botUserID,
	}

	if data.ToID == botUserID {
		var users []model.User
		err = mn.user.List(ctx, &users, repo.QueryWithEqual("role", model.UserRoleAdmin))
		if err != nil {
			logger.WithErr(err).Warn("notify get admin user failed")
			return nil
		}

		for _, user := range users {
			dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
				UserID:              user.ID,
				MessageNotifyCommon: common,
				Read:                false,
			})

			topics[user.ID] = topic.NewMessageNotifyUser(user.ID)
		}

		switch data.Type {
		case model.MsgNotifyTypeDislikeComment:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeDislikeBotComment,
				UserID:    data.FromID,
				DiscussID: data.DiscussID,
			})
		case model.MsgNotifyTypeBotUnknown:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeDislikeBotComment,
				UserID:    data.FromID,
				DiscussID: data.DiscussID,
			})
		}
		if err != nil {
			logger.WithErr(err).Warn("send webhook message failed")
		}
	} else {
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

	for _, notify := range dbMessageNotify {
		topic, ok := topics[notify.UserID]
		if !ok {
			logger.With("notify", notify.UserID).Warn("can not find topic to notify, skip")
			continue
		}

		err = mn.pub.Publish(ctx, topic, model.MessageNotifyInfo{
			ID:                  notify.ID,
			MessageNotifyCommon: notify.MessageNotifyCommon,
		})
		if err != nil {
			logger.WithErr(err).With("topic", topic).Warn("publish msg failed")
		}
	}

	return nil
}
