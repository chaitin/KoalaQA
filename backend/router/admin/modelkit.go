package admin

import (
	"errors"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type modelkit struct {
	mk *svc.ModelKit
}

func newModelKit(mk *svc.ModelKit) server.Router {
	return &modelkit{
		mk: mk,
	}
}

func init() {
	registerAdminAPIRouter(newModelKit)
}

// List Model Provider Supported
// @Summary list model provider supported
// @Tags modelkit
// @Accept json
// @Produce json
// @Param req body svc.MKSupportedReq true "request params"
// @Success 200 {object} context.Response{data=svc.MKSupportedRes}
// @Router /admin/model/provider/supported [post]
func (m *modelkit) supported(ctx *context.Context) {
	var req svc.MKSupportedReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	supported, err := m.mk.Supported(ctx, req)
	if err != nil {
		ctx.InternalError(err, "get supported model failed")
		return
	}
	ctx.Success(supported)
}

// Check Model
// @Summary check model
// @Tags modelkit
// @Accept json
// @Produce json
// @Param req body svc.ModelKitCheckReq true "request params"
// @Success 200 {object} context.Response{data=svc.CheckModelRes}
// @Router /admin/model/check [post]
func (m *modelkit) checkModel(ctx *context.Context) {
	var req svc.ModelKitCheckReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	model, err := m.mk.CheckModel(ctx, req)
	if err != nil {
		ctx.InternalError(err, "check model failed")
		return
	}
	ctx.Success(model)
}

// Create Model
// @Summary create model
// @Tags modelkit
// @Accept json
// @Produce json
// @Param req body svc.MKCreateReq true "request params"
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/model [post]
func (m *modelkit) createModel(ctx *context.Context) {
	var req svc.MKCreateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	id, err := m.mk.CreateModel(ctx, req)
	if err != nil {
		ctx.InternalError(err, "create model failed")
		return
	}
	ctx.Success(id)
}

// Update Model
// @Summary update model
// @Tags modelkit
// @Accept json
// @Produce json
// @Param req body svc.MKUpdateReq true "request params"
// @Success 200 {object} context.Response{data=nil}
// @Router /admin/model/{id} [put]
func (m *modelkit) updateModel(ctx *context.Context) {
	id, err := ctx.ParamUint("id")
	if err != nil {
		ctx.BadRequest(errors.New("id is required"))
		return
	}
	var req svc.MKUpdateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	err = m.mk.UpdateByID(ctx, id, req)
	if err != nil {
		ctx.InternalError(err, "update model failed")
		return
	}
	ctx.Success(nil)
}

// Delete Model

// List Model
// @Summary list model
// @Tags modelkit
// @Accept json
// @Produce json
// @Success 200 {object} context.Response{data=[]model.LLM}
// @Router /admin/model/list [get]
func (m *modelkit) listModel(ctx *context.Context) {
	items, err := m.mk.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list model failed")
		return
	}
	ctx.Success(items)
}

func (m *modelkit) Route(h server.Handler) {
	g := h.Group("/model")
	{
		g.POST("/provider/supported", m.supported)
		g.POST("/check", m.checkModel)
		g.POST("", m.createModel)
		g.PUT(":id", m.updateModel)
		g.GET("list", m.listModel)
	}
}
