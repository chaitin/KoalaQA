package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type user struct {
	svcUser *svc.User
}

// List
// @Summary list user
// @Tags user
// @Param req query svc.UserListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.UserListItem}}
// @Router /admin/user [get]
func (u *user) List(ctx *context.Context) {
	var req svc.UserListReq

	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcUser.List(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list user failed")
		return
	}

	ctx.Success(res)
}

// Detail
// @Summary user detail
// @Tags user
// @Param user_id path uint true "user id"
// @Produce json
// @Success 200 {object} context.Response{data=model.User}
// @Router /admin/user/{user_id} [get]
func (u *user) Detail(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcUser.Detail(ctx, userID)
	if err != nil {
		ctx.InternalError(err, "get detail failed")
		return
	}

	ctx.Success(res)
}

// Update
// @Summary update user
// @Tags user
// @Param user_id path uint true "user id"
// @Param req body svc.UserUpdateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/user/{user_id} [put]
func (u *user) Update(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UserUpdateReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcUser.Update(ctx, ctx.GetUser().UID, userID, req)
	if err != nil {
		ctx.InternalError(err, "update user failed")
		return
	}

	ctx.Success(nil)
}

// Delete
// @Summary delete user
// @Tags user
// @Param user_id path uint true "user id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/user/{user_id} [delete]
func (u *user) Delete(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcUser.Delete(ctx, userID)
	if err != nil {
		ctx.InternalError(err, "delete user failed")
		return
	}

	ctx.Success(nil)
}

// JoinOrg
// @Summary user join org
// @Tags user
// @Param req body svc.UserJoinOrgReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/user/join_org [post]
func (u *user) JoinOrg(ctx *context.Context) {
	var req svc.UserJoinOrgReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcUser.JoinOrg(ctx, req)
	if err != nil {
		ctx.InternalError(err, "user join org failed")
		return
	}

	ctx.Success(nil)
}

// ListSearchHistory
// @Summary list user search history
// @Tags user
// @Param req query svc.ListSearchHistoryReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.UserSearchHistory}}
// @Router /admin/user/history/search [get]
func (u *user) ListSearchHistory(ctx *context.Context) {
	var req svc.ListSearchHistoryReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcUser.ListSearchHistory(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list search history failed")
		return
	}

	ctx.Success(res)
}

func (u *user) Route(h server.Handler) {
	{
		g := h.Group("/user")
		g.GET("", u.List)
		g.GET("/history/search", u.ListSearchHistory)
		g.POST("/join_org", u.JoinOrg)
		{
			userG := g.Group("/:user_id")
			userG.GET("", u.Detail)
			userG.PUT("", u.Update)
			userG.DELETE("", u.Delete)
		}
	}
}

func newUser(u *svc.User) server.Router {
	return &user{svcUser: u}
}

func init() {
	registerAdminAPIRouter(newUser)
}
