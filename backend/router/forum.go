package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type forum struct {
	svc *svc.Forum
}

func newForum(svc *svc.Forum) server.Router {
	return &forum{svc: svc}
}

func init() {
	registerApiNoAuthRouter(newForum)
}

func (f *forum) Route(h server.Handler) {
	g := h.Group("/forum")
	g.GET("", f.List)
}

// List
// @Summary list forums
// @Tags forum
// @Produce json
// @Success 200 {object} context.Response{data=[]model.ForumInfo}
// @Router /forum [get]
func (f *forum) List(ctx *context.Context) {
	res, err := f.svc.List(ctx, ctx.GetUser(), true)
	if err != nil {
		ctx.InternalError(err, "failed to list forums")
		return
	}
	ctx.Success(res)
}
