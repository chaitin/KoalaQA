package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type UserPoint struct {
	pub      mq.Publisher
	disc     *repo.Discussion
	comm     *repo.Comment
	commLike *repo.CommentLike
	logger   *glog.Logger
}

func newUserPoint(pub mq.Publisher, disc *repo.Discussion, comm *repo.Comment, commLike *repo.CommentLike) *UserPoint {
	return &UserPoint{
		pub:      pub,
		disc:     disc,
		comm:     comm,
		commLike: commLike,
		logger:   glog.Module("svc", "user_point"),
	}
}

func init() {
	registerSvc(newUserPoint)
}

func (u *UserPoint) RevokeCommentPoint(ctx context.Context, disc model.Discussion, comments ...model.Comment) error {
	logger := u.logger.WithContext(ctx).With("comments_len", len(comments))
	answerIDs := make(model.Int64Array, 0, len(comments))
	commentUser := make(map[uint]uint)
	var botUserID uint = 0
	for _, comment := range comments {
		answerIDs = append(answerIDs, int64(comment.ID))
		commentUser[comment.ID] = comment.UserID

		if comment.Accepted {
			err := u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    comment.UserID,
					Type:      model.UserPointTypeAnswerAccepted,
					ForeignID: comment.ID,
					FromID:    comment.AcceptedBy,
				},
				Revoke: true,
			})
			if err != nil {
				logger.WithErr(err).Error("pub user point failed")
				return err
			}

			err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID:    disc.UserID,
					Type:      model.UserPointTypeAcceptAnswer,
					ForeignID: disc.ID,
					FromID:    disc.UserID,
				},
				Revoke: true,
			})
			if err != nil {
				logger.WithErr(err).Error("pub user point failed")
				return err
			}
		}

		if comment.Bot {
			botUserID = comment.UserID
		}

		err := u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID:    comment.UserID,
				Type:      model.UserPointTypeAnswerQA,
				ForeignID: comment.ID,
				FromID:    disc.UserID,
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
		err := u.commLike.List(ctx, &commentLikes,
			repo.QueryWithEqual("discussion_id", disc.ID),
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
				commentUserID := commentUser[commentLike.CommentID]
				err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    commentUserID,
						Type:      model.UserPointTypeAnswerDisliked,
						ForeignID: commentLike.CommentID,
						FromID:    commentLike.UserID,
					},
					Revoke: true,
				})
				if err != nil {
					logger.WithErr(err).Error("pub user point failed")
					return err
				}

				if botUserID != commentUserID {
					err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
						UserPointRecordInfo: model.UserPointRecordInfo{
							UserID:    commentLike.UserID,
							Type:      model.UserPointTypeDislikeAnswer,
							ForeignID: commentLike.CommentID,
							FromID:    commentUserID,
						},
						Revoke: true,
					})
					if err != nil {
						logger.WithErr(err).Error("pub user point failed")
						return err
					}
				}
			case model.CommentLikeStateLike:
				err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID:    commentUser[commentLike.CommentID],
						Type:      model.UserPointTypeAnswerLiked,
						ForeignID: commentLike.CommentID,
						FromID:    commentLike.UserID,
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

	return nil
}

func (u *UserPoint) RevokeDiscussionPoint(ctx context.Context, discID uint) error {
	logger := u.logger.WithContext(ctx).With("disc_id", discID)
	var disc model.Discussion
	err := u.disc.GetByID(ctx, &disc, discID)
	if err != nil {
		logger.WithErr(err).Warn("get discussion failed")
		return err
	}

	if disc.Type != model.DiscussionTypeQA {
		logger.Debug("disc is not qa, skip")
		return nil
	}

	var comments []model.Comment
	err = u.comm.List(ctx, &comments,
		repo.QueryWithEqual("comments.discussion_id", discID),
		repo.QueryWithEqual("comments.parent_id", 0),
		repo.QueryWithSelectColumn("comments.id", "comments.user_id", "comments.accepted", "comments.bot"),
	)
	if err != nil {
		logger.WithErr(err).Error("get qa all answer failed")
		return err
	}

	err = u.RevokeCommentPoint(ctx, disc, comments...)
	if err != nil {
		logger.WithErr(err).Error("revoke comments point failed")
		return err
	}
	return nil
}
