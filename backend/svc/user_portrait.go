package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type UserPortrait struct {
	repoPortrait *repo.UserPortrait
}

func newUserPortrait(portrait *repo.UserPortrait) *UserPortrait {
	return &UserPortrait{
		repoPortrait: portrait,
	}
}

type UserPortraitListItem struct {
	model.UserPortrait

	Username string `json:"username" gorm:"column:user_name"`
}

func (u *UserPortrait) List(ctx context.Context, user model.UserInfo, userID uint) (*model.ListRes[UserPortraitListItem], error) {
	if !user.CanOperator(0) {
		return nil, errPermission
	}

	var res model.ListRes[UserPortraitListItem]
	err := u.repoPortrait.ListWithUser(ctx, &res.Items,
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithOrderBy("created_at DESC"),
	)
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

type UserPortraitReq struct {
	Content string `json:"content" binding:"required"`
}

func (u *UserPortrait) Create(ctx context.Context, user model.UserInfo, userID uint, req UserPortraitReq) (uint, error) {
	if !user.CanOperator(0) {
		return 0, errPermission
	}

	portrait := model.UserPortrait{
		UserID:    userID,
		Content:   req.Content,
		CreatedBy: user.UID,
	}
	err := u.repoPortrait.Create(ctx, &portrait)
	if err != nil {
		return 0, err
	}

	return portrait.ID, nil
}

func (u *UserPortrait) Update(ctx context.Context, user model.UserInfo, id uint, req UserPortraitReq) error {
	if !user.CanOperator(0) {
		return errPermission
	}

	err := u.repoPortrait.Update(ctx, map[string]any{
		"content":    req.Content,
		"created_by": user.UID,
	}, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	return nil
}

func (u *UserPortrait) Delete(ctx context.Context, id uint, user model.UserInfo) error {
	if !user.CanOperator(0) {
		return errPermission
	}

	err := u.repoPortrait.DeleteByID(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

func init() {
	registerSvc(newUserPortrait)
}
