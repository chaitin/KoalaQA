package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type userPortrait struct {
	svcPortrait *svc.UserPortrait
}

func (u *userPortrait) Route(h server.Handler) {
	g := h.Group("/user/:user_id/portrait")
	g.GET("", u.List)
	g.POST("", u.Create)
	g.PUT("/:portrait_id", u.Update)
	g.DELETE("/:portrait_id", u.Delete)
}

func newUserPortrait(portrait *svc.UserPortrait) server.Router {
	return &userPortrait{
		svcPortrait: portrait,
	}
}

// List
// @Summary list user portrait
// @Tags user
// @Produce json
// @Param user_id path string true "user_id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.UserPortraitListItem}}
// @Router /user/{user_id}/portrait [get]
func (u *userPortrait) List(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcPortrait.List(ctx, ctx.GetUser(), userID)
	if err != nil {
		ctx.InternalError(err, "list portrait failed")
		return
	}

	ctx.Success(res)
}

// Create
// @Summary create user portrait
// @Tags user
// @Accept json
// @Produce json
// @Param user_id path string true "user_id"
// @Param req body svc.UserPortraitReq true "req param"
// @Success 200 {object} context.Response{data=uint}
// @Router /user/{user_id}/portrait [post]
func (u *userPortrait) Create(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UserPortraitReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcPortrait.Create(ctx, ctx.GetUser(), userID, req)
	if err != nil {
		ctx.InternalError(err, "create portrait failed")
		return
	}

	ctx.Success(res)
}

// Update
// @Summary update user portrait
// @Tags user
// @Accept json
// @Produce json
// @Param user_id path string true "user_id"
// @Param portrait_id path string true "portrait_id"
// @Param req body svc.UserPortraitReq true "req param"
// @Success 200 {object} context.Response
// @Router /user/{user_id}/portrait/{portrait_id} [put]
func (u *userPortrait) Update(ctx *context.Context) {
	portraitID, err := ctx.ParamUint("portrait_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UserPortraitReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcPortrait.Update(ctx, ctx.GetUser(), portraitID, req)
	if err != nil {
		ctx.InternalError(err, "update portrait failed")
		return
	}

	ctx.Success(nil)
}

// Delete
// @Summary delete user portrait
// @Tags user
// @Accept json
// @Produce json
// @Param user_id path string true "user_id"
// @Param portrait_id path string true "portrait_id"
// @Success 200 {object} context.Response
// @Router /user/{user_id}/portrait/{portrait_id} [delete]
func (u *userPortrait) Delete(ctx *context.Context) {
	portraitID, err := ctx.ParamUint("portrait_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcPortrait.Delete(ctx, portraitID, ctx.GetUser())
	if err != nil {
		ctx.InternalError(err, "delete portrait failed")
		return
	}

	ctx.Success(nil)
}

func init() {
	registerApiAuthRouter(newUserPortrait)
}
