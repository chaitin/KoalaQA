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

	var (
		topics          []mq.Topic
		dbMessageNotify []model.MessageNotify
	)

	notifyInfo := model.MessageNotifyInfo{
		DiscussID:    data.DiscussID,
		DiscussTitle: data.DiscussTitle,
		Type:         data.Type,
		FromID:       data.From.ID,
		FromName:     data.From.Name,
		FromBot:      data.From.ID == botUserID,
		ToID:         data.To.ID,
		ToName:       data.To.Name,
		ToBot:        data.To.ID == botUserID,
	}

	if data.To.ID == botUserID {
		var users []model.User
		err = mn.user.List(ctx, &users, repo.QueryWithEqual("role", model.UserRoleAdmin))
		if err != nil {
			logger.WithErr(err).Warn("notify get admin user failed")
			return nil
		}

		for _, user := range users {
			dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
				UserID:            user.ID,
				MessageNotifyInfo: notifyInfo,
				Read:              false,
			})

			topics = append(topics, topic.NewMessageNotifyUser(user.ID))
		}

		switch data.Type {
		case model.MsgNotifyTypeDislikeComment:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeDislikeBotComment,
				UserID:    data.From.ID,
				DiscussID: data.DiscussID,
			})
		case model.MsgNotifyTypeBotUnknown:
			err = mn.natsPub.Publish(ctx, topic.TopicDiscussWebhook, topic.MsgDiscussWebhook{
				MsgType:   message.TypeDislikeBotComment,
				UserID:    data.From.ID,
				DiscussID: data.DiscussID,
			})
		}
		if err != nil {
			logger.WithErr(err).Warn("send webhook message failed")
		}
	} else {
		dbMessageNotify = append(dbMessageNotify, model.MessageNotify{
			UserID:            data.To.ID,
			MessageNotifyInfo: notifyInfo,
			Read:              false,
		})

		topics = append(topics, topic.NewMessageNotifyUser(data.To.ID))
	}

	err = mn.mn.BatchCreate(ctx, dbMessageNotify...)
	if err != nil {
		logger.WithErr(err).Warn("batch create notify failed")
		return nil
	}

	for _, topic := range topics {
		err = mn.pub.Publish(ctx, topic, notifyInfo)
		if err != nil {
			logger.WithErr(err).With("topic", topic).Warn("publish msg failed")
		}
	}

	return nil
}
