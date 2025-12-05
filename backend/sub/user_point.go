package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type userPoint struct {
	logger *glog.Logger

	userPoint *repo.UserPointRecord
}

func newUserPoint(up *repo.UserPointRecord) *userPoint {
	return &userPoint{
		logger:    glog.Module("sub", "user_point"),
		userPoint: up,
	}
}

func (u *userPoint) MsgType() mq.Message {
	return topic.MsgUserPoint{}
}

func (u *userPoint) Topic() mq.Topic {
	return topic.TopicUserPoint
}

func (u *userPoint) Group() string {
	return "koala_user_point"
}

func (u *userPoint) AckWait() time.Duration {
	return time.Minute * 1
}

func (u *userPoint) Concurrent() uint {
	return 1
}

func (u *userPoint) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgUserPoint)

	logger := u.logger.WithContext(ctx).With("msg", data)

	logger.Debug("receive user point msg")

	err := u.userPoint.CreateRecord(ctx, data.UserPointRecordInfo, data.Revoke)
	if err != nil {
		logger.WithErr(err).Error("create user point record failed")
		return err
	}

	return nil
}
