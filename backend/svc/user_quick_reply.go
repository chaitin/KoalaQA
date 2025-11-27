package svc

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type UserQuickReply struct {
	repoUserQR *repo.UserQuickReply
}

func newUserQuickReply(userQR *repo.UserQuickReply) *UserQuickReply {
	return &UserQuickReply{
		repoUserQR: userQR,
	}
}

func (u *UserQuickReply) canAccess(user model.UserInfo) bool {
	return user.Role == model.UserRoleAdmin || user.Role == model.UserRoleOperator
}

func (u *UserQuickReply) List(ctx context.Context, user model.UserInfo) (*model.ListRes[model.UserQuickReply], error) {
	if !u.canAccess(user) {
		return nil, errPermission
	}

	var res model.ListRes[model.UserQuickReply]
	err := u.repoUserQR.List(ctx, &res.Items, repo.QueryWithEqual("user_id", user.UID), repo.QueryWithOrderBy("index ASC"))
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

type UserQuickReplyReq struct {
	Name    string `json:"name" binding:"required,max=10"`
	Content string `json:"content" binding:"required"`
}

func (u *UserQuickReply) Create(ctx context.Context, user model.UserInfo, req UserQuickReplyReq) (uint, error) {
	if !u.canAccess(user) {
		return 0, errPermission
	}

	userQR := model.UserQuickReply{
		UserID:  user.UID,
		Name:    req.Name,
		Content: req.Content,
	}
	err := u.repoUserQR.Create(ctx, &userQR)
	if err != nil {
		return 0, err
	}

	return userQR.ID, nil
}

func (u *UserQuickReply) Update(ctx context.Context, user model.UserInfo, id uint, req UserQuickReplyReq) error {
	if !u.canAccess(user) {
		return errPermission
	}

	return u.repoUserQR.Update(ctx, map[string]any{
		"name":       req.Name,
		"content":    req.Content,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", id), repo.QueryWithEqual("user_id", user.UID))
}

func (u *UserQuickReply) Delete(ctx context.Context, user model.UserInfo, id uint) error {
	if !u.canAccess(user) {
		return errPermission
	}

	return u.repoUserQR.DeleteByID(ctx, id, user.UID)
}

type QuickReplyReindexReq struct {
	IDs []uint `json:"ids" binding:"required"`
}

func (u *UserQuickReply) Reindex(ctx context.Context, user model.UserInfo, req QuickReplyReindexReq) error {
	if !u.canAccess(user) {
		return errPermission
	}

	return u.repoUserQR.Reindex(ctx, user.UID, req.IDs)
}

func init() {
	registerSvc(newUserQuickReply)
}
