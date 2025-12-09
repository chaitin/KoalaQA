package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type userPoint struct {
	logger *glog.Logger

	userPoint *repo.UserPointRecord
	pub       mq.Publisher
}

func newUserPoint(up *repo.UserPointRecord, pub mq.Publisher) *userPoint {
	return &userPoint{
		logger:    glog.Module("sub", "user_point"),
		userPoint: up,
		pub:       pub,
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

	var (
		todayAddPoint int
		addPoint      int
	)
	err := u.userPoint.CreateRecord(ctx, data.UserPointRecordInfo, data.Revoke, &todayAddPoint, &addPoint)
	if err != nil {
		logger.WithErr(err).Error("create user point record failed")
		return err
	}

	if addPoint > 0 {
		point := 0
		switch {
		case todayAddPoint == 0:
			point = addPoint
		case todayAddPoint < 25 && todayAddPoint+addPoint >= 25:
			point = 25
		case todayAddPoint < 50 && todayAddPoint+addPoint >= 50:
			point = 50
		case todayAddPoint < 100 && todayAddPoint+addPoint >= 100:
			point = 100
		}
		if point > 0 {
			u.pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
				UserPointHeader: model.UserPointHeader{
					UserPoint: point,
				},
				Type: model.MsgNotifyTypeUserPoint,
				ToID: data.UserID,
			})
		}
	}

	return nil
}
