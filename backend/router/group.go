package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type group struct {
	svcG *svc.Group
}

// List
// @Summary frontend list group
// @Tags group_frontend
// @Produce json
// @Param forum_id query uint false "forum id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.GroupWithItem{items=[]model.GroupItemInfo}}}
// @Router /group [get]
func (g *group) List(ctx *context.Context) {
	forumID, err := ctx.QueryUint("forum_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := g.svcG.ListWithItem(ctx, ctx.GetUser().UID, forumID)
	if err != nil {
		ctx.InternalError(err, "list group failed")
		return
	}

	ctx.Success(res)
}

func (g *group) Route(h server.Handler) {
	gr := h.Group("/group")
	gr.GET("", g.List)
}

func newGroup(g *svc.Group) server.Router {
	return &group{svcG: g}
}

func init() {
	registerApiNoAuthRouter(newGroup)
}
