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
	g.GET("/:forum_id/tags", f.ListTags)
}

// List
// @Summary list forums
// @Tags forum
// @Produce json
// @Success 200 {object} context.Response{data=[]svc.ForumRes}
// @Router /forum [get]
func (f *forum) List(ctx *context.Context) {
	res, err := f.svc.List(ctx, ctx.GetUser(), true)
	if err != nil {
		ctx.InternalError(err, "failed to list forums")
		return
	}
	ctx.Success(res)
}

// ListTags
// @Summary list forum tags
// @Tags forum
// @Produce json
// @Param forum_id path uint false "forum id"
// @Success 200 {object} context.Response{data=[]model.ListRes{items=[]model.DiscussionTag}}
// @Router /forum/{forum_id}/tags [get]
func (f *forum) ListTags(ctx *context.Context) {
	forumID, err := ctx.ParamUint("forum_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := f.svc.ListForumTags(ctx, forumID)
	if err != nil {
		ctx.InternalError(err, "list forum tags failed")
		return
	}

	ctx.Success(res)
}
