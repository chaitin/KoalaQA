package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type DiscUserPoint struct {
	logger *glog.Logger

	disc      *repo.Discussion
	userPoint *svc.UserPoint
	pub       mq.Publisher
}

func newDiscUserPoint(pub mq.Publisher, disc *repo.Discussion, userPoint *svc.UserPoint) *DiscUserPoint {
	return &DiscUserPoint{
		logger:    glog.Module("sub", "disc_user_point"),
		pub:       pub,
		disc:      disc,
		userPoint: userPoint,
	}
}

func (d *DiscUserPoint) MsgType() mq.Message {
	return topic.MsgDiscChange{}
}

func (d *DiscUserPoint) Topic() mq.Topic {
	return topic.TopicDiscChange
}

func (d *DiscUserPoint) Group() string {
	return "koala_discussion_change_user_point"
}

func (d *DiscUserPoint) AckWait() time.Duration {
	return time.Minute * 5
}

func (d *DiscUserPoint) Concurrent() uint {
	return 1
}

func (d *DiscUserPoint) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscChange)

	switch data.OP {
	case topic.OPInsert:
		return d.handleInsert(ctx, data)
	case topic.OPDelete:
		return d.handleDelete(ctx, data)
	default:
		d.logger.WithContext(ctx).With("msg", data).Debug("ignore message")
	}

	return nil
}

func (d *DiscUserPoint) handleInsert(ctx context.Context, data topic.MsgDiscChange) error {
	logger := d.logger.WithContext(ctx).With("msg", data)
	if data.Type != model.DiscussionTypeBlog {
		logger.Debug("ingore message")
		return nil
	}

	logger.Info("receove insert msg")

	err := d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
		UserPointRecordInfo: model.UserPointRecordInfo{
			UserID:    data.UserID,
			Type:      model.UserPointTypeCreateBlog,
			ForeignID: data.DiscID,
			FromID:    0,
		},
	})
	if err != nil {
		logger.WithErr(err).Warn("pub user point failed")
		return err
	}

	return nil
}

func (d *DiscUserPoint) handleDelete(ctx context.Context, data topic.MsgDiscChange) error {
	logger := d.logger.WithContext(ctx).With("msg", data)

	if data.Type != model.DiscussionTypeBlog && data.Type != model.DiscussionTypeQA {
		logger.Debug("ignore message")
		return nil
	}

	logger.Info("receove delete msg")
	switch data.Type {
	case model.DiscussionTypeBlog:
		err := d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    data.UserID,
				Type:      model.UserPointTypeCreateBlog,
				ForeignID: data.DiscID,
				FromID:    0,
			},
			Revoke: true,
		})
		if err != nil {
			logger.WithErr(err).Error("pub user point failed")
			return err
		}

		discLikes, err := d.disc.ListDiscLike(ctx, data.DiscUUID)
		if err != nil {
			logger.WithErr(err).Error("list disc like failed")
			return err
		}
		for _, discLike := range discLikes {
			err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    data.UserID,
					Type:      model.UserPointTypeLikeBlog,
					ForeignID: data.DiscID,
					FromID:    discLike.UserID,
				},
				Revoke: true,
			})
			if err != nil {
				logger.WithErr(err).Error("pub user point failed")
				return err
			}
		}
	case model.DiscussionTypeQA:
		err := d.userPoint.RevokeDiscussionPoint(ctx, data.DiscID, data.Type, data.UserID)
		if err != nil {
			logger.WithErr(err).Error("revoke comment user point failed")
			return err
		}
	}

	err := d.disc.DeleteDiscLike(ctx, data.DiscUUID)
	if err != nil {
		logger.WithErr(err).Warn("remove dleted disc like failed")
	}

	return nil
}
