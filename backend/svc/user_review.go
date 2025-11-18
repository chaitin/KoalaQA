package svc

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type UserReview struct {
	repoReview *repo.UserReview
	repoUser   *repo.User
	pub        mq.Publisher
}

type UserReviewListReq struct {
	*model.Pagination

	State []model.UserReviewState `form:"state"`
}

func (u *UserReview) List(ctx context.Context, req UserReviewListReq) (*model.ListRes[model.UserReviewWithUser], error) {
	var res model.ListRes[model.UserReviewWithUser]
	err := u.repoReview.ListWithUser(ctx, &res.Items,
		repo.QueryWithEqual("state", req.State, repo.EqualOPIn),
		repo.QueryWithPagination(req.Pagination),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoReview.Count(ctx, &res.Total,
		repo.QueryWithEqual("state", req.State),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type UserReviewGuestCreateReq struct {
	Reason string `json:"reason" binding:"required"`
}

func (u *UserReview) GuestCreate(ctx context.Context, user model.UserInfo, req UserReviewGuestCreateReq) error {
	updated, err := u.repoReview.CreateNotExist(ctx, &model.UserReview{
		Type:     model.UserReviewTypeGuest,
		UserID:   user.UID,
		AuthType: user.AuthType,
		Reason:   req.Reason,
		State:    model.UserReviewStateReview,
	})
	if err != nil {
		return err
	}

	if !updated {
		return errors.New("already have review")
	}

	return nil
}

type UserReviewUpdateReq struct {
	State model.UserReviewState `json:"state" binding:"required,min=1,max=2"`
}

func (u *UserReview) Update(ctx context.Context, opUID uint, id uint, req UserReviewUpdateReq) error {
	var review model.UserReview
	err := u.repoReview.GetByID(ctx, &review, id)
	if err != nil {
		return err
	}

	if review.State != model.UserReviewStateReview {
		return errors.New("already reviewed")
	}

	err = u.repoReview.Update(ctx, map[string]any{
		"state":      req.State,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	switch review.Type {
	case model.UserReviewTypeGuest:
		if req.State == model.UserReviewStateDeny {
			break
		}

		err = u.repoUser.Update(ctx, map[string]any{
			"role":       model.UserRoleUser,
			"updated_at": time.Now(),
		}, repo.QueryWithEqual("id", review.UserID),
			repo.QueryWithEqual("role", model.UserRoleGuest),
		)
		if err != nil {
			return err
		}

		u.pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
			UserReviewHeader: model.UserReviewHeader{
				ReviewID:    review.ID,
				ReviewType:  review.Type,
				ReviewState: req.State,
			},
			Type:   model.MsgNotifyTypeUserReview,
			FromID: opUID,
			ToID:   review.ID,
		})
	}

	return nil
}

func newUserReview(review *repo.UserReview, user *repo.User, pub mq.Publisher) *UserReview {
	return &UserReview{
		repoUser:   user,
		repoReview: review,
		pub:        pub,
	}
}

func init() {
	registerSvc(newUserReview)
}
