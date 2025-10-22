package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type group struct {
	svcG *svc.Group
}

// List
// @Summary list group
// @Tags group
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.GroupWithItem{items=[]model.GroupItemInfo}}}
// @Router /admin/group [get]
func (g *group) List(ctx *context.Context) {
	res, err := g.svcG.ListWithItem(ctx, 0)
	if err != nil {
		ctx.InternalError(err, "list group failed")
		return
	}

	ctx.Success(res)
}

// Update
// @Summary update group
// @Tags group
// @Accept json
// @Param req body svc.GroupUpdateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/group [put]
func (g *group) Update(ctx *context.Context) {
	var req svc.GroupUpdateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = g.svcG.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update group failed")
		return
	}

	ctx.Success(nil)
}

func (g *group) Route(h server.Handler) {
	gr := h.Group("/group")
	gr.GET("", g.List)
	gr.PUT("", g.Update)
}

func newGroup(g *svc.Group) server.Router {
	return &group{
		svcG: g,
	}
}

func init() {
	registerAdminAPIRouter(newGroup)
}
