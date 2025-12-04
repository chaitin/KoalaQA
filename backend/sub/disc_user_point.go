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

type DiscUserPoint struct {
	logger *glog.Logger

	disc     *repo.Discussion
	comm     *repo.Comment
	commLike *repo.CommentLike
	pub      mq.Publisher
}

func newDiscUserPoint(pub mq.Publisher, disc *repo.Discussion, comm *repo.Comment, commLike *repo.CommentLike) *DiscUserPoint {
	return &DiscUserPoint{
		logger:   glog.Module("sub", "disc_user_point"),
		pub:      pub,
		disc:     disc,
		comm:     comm,
		commLike: commLike,
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
		},
		Revoke: false,
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
					ForeignID: discLike.UserID,
				},
				Revoke: true,
			})
			if err != nil {
				logger.WithErr(err).Error("pub user point failed")
				return err
			}
		}
	case model.DiscussionTypeQA:
		var comments []model.Comment
		err := d.comm.List(ctx, &comments,
			repo.QueryWithEqual("comments.discussion_id", data.DiscID),
			repo.QueryWithEqual("comments.parent_id", 0),
			repo.QueryWithSelectColumn("comments.id", "comments.user_id", "comments.accepted"),
		)
		if err != nil {
			logger.WithErr(err).Error("get qa all answer failed")
			return err
		}

		answerIDs := make(model.Int64Array, 0, len(comments))
		commentUser := make(map[uint]uint)
		for _, comment := range comments {
			answerIDs = append(answerIDs, int64(comment.ID))
			commentUser[comment.ID] = comment.UserID

			if comment.Accepted {
				err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    comment.UserID,
						Type:      model.UserPointTypeAnswerAccepted,
						ForeignID: comment.ID,
					},
					Revoke: true,
				})
				if err != nil {
					logger.WithErr(err).Error("pub user point failed")
					return err
				}

				err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    data.UserID,
						Type:      model.UserPointTypeAcceptAnswer,
						ForeignID: data.DiscID,
					},
					Revoke: true,
				})
				if err != nil {
					logger.WithErr(err).Error("pub user point failed")
					return err
				}
			}
			err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerQA,
					ForeignID: comment.ID,
				},
				Revoke: true,
			})
			if err != nil {
				logger.WithErr(err).Error("pub user point failed")
				return err
			}
		}

		if len(answerIDs) > 0 {
			var commentLikes []model.CommentLike
			err = d.commLike.List(ctx, &commentLikes,
				repo.QueryWithEqual("discussion_id", data.DiscID),
				repo.QueryWithEqual("comment_id", answerIDs, repo.EqualOPEqAny),
				repo.QueryWithSelectColumn("comment_id", "user_id", "state"),
			)
			if err != nil {
				logger.WithErr(err).Warn("list comment like failed")
				return err
			}

			for _, commentLike := range commentLikes {
				switch commentLike.State {
				case model.CommentLikeStateDislike:
					err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
						UserPointRecordInfo: model.UserPointRecordInfo{
							UserID:    commentUser[commentLike.CommentID],
							Type:      model.UserPointTypeAnswerDisliked,
							ForeignID: commentLike.CommentID,
						},
						Revoke: true,
					})
					if err != nil {
						logger.WithErr(err).Error("pub user point failed")
						return err
					}

					err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
						UserPointRecordInfo: model.UserPointRecordInfo{
							UserID:    commentLike.UserID,
							Type:      model.UserPointTypeDislikeAnswer,
							ForeignID: commentLike.CommentID,
						},
						Revoke: true,
					})
					if err != nil {
						logger.WithErr(err).Error("pub user point failed")
						return err
					}
				case model.CommentLikeStateLike:
					err = d.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
						UserPointRecordInfo: model.UserPointRecordInfo{
							UserID:    commentUser[commentLike.CommentID],
							Type:      model.UserPointTypeAnswerLiked,
							ForeignID: commentLike.CommentID,
						},
						Revoke: true,
					})
					if err != nil {
						logger.WithErr(err).Error("pub user point failed")
						return err
					}
				}
			}
		}
	}

	return nil
}
