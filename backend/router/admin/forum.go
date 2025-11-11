package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type forum struct {
	svcForum *svc.Forum
}

func (f *forum) Route(h server.Handler) {
	g := h.Group("/forum")
	g.GET("", f.List)
	g.PUT("", f.Update)
}

func newForum(f *svc.Forum) server.Router {
	return &forum{svcForum: f}
}

func init() {
	registerAdminAPIRouter(newForum)
}

// List
// @Summary list forum
// @Tags forum
// @Produce json
// @Success 200 {object} context.Response{data=[]svc.ForumRes{groups=[]model.ForumGroups}}
// @Router /admin/forum [get]
func (f *forum) List(ctx *context.Context) {
	res, err := f.svcForum.List(ctx, ctx.GetUser(), false)
	if err != nil {
		ctx.InternalError(err, "list forum failed")
		return
	}
	ctx.Success(res)
}

// Update
// @Summary update forum
// @Tags forum
// @Accept json
// @Param req body svc.ForumUpdateReq{forums=[]model.ForumInfo{groups=[]model.ForumGroups}} true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/forum [put]
func (f *forum) Update(ctx *context.Context) {
	var req svc.ForumUpdateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = f.svcForum.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update forum failed")
		return
	}
	ctx.Success(nil)
}
