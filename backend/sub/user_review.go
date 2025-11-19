package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/svc"
	"go.uber.org/fx"
)

type userReviewIn struct {
	fx.In

	SvcWebhook *svc.Webhook
	Generator  *message.Generator
}
type userReview struct {
	in userReviewIn

	logger *glog.Logger
}

func newUserReview(in userReviewIn) *userReview {
	return &userReview{
		in:     in,
		logger: glog.Module("sub", "user_review"),
	}
}

func (u *userReview) MsgType() mq.Message {
	return topic.MsgUserReview{}
}

func (u *userReview) Topic() mq.Topic {
	return topic.TopicUserReview
}

func (u *userReview) Group() string {
	return "koala_user_review"
}

func (u *userReview) AckWait() time.Duration {
	return time.Minute * 1
}

func (u *userReview) Concurrent() uint {
	return 1
}

func (u *userReview) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgUserReview)

	logger := u.logger.WithContext(ctx).With("msg", data)

	var msgType message.Type
	switch data.Type {
	case model.UserReviewTypeGuest:
		msgType = message.TypeUserReviewGuest
	default:
		logger.Debug("review type not supported, skip")
		return nil
	}

	logger.Info("send user review webhook...")
	webhookMsg, err := u.in.Generator.UserReview(ctx, msgType, data.ID)
	if err != nil {
		logger.WithErr(err).Warn("generate user review msg failed")
		return nil
	}
	err = u.in.SvcWebhook.Send(ctx, webhookMsg)
	if err != nil {
		logger.WithErr(err).Warn("send user review msg failed")
		return nil
	}

	return nil
}
