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
	g.GET("/:forum_id/tags", f.ListAllTag)
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

// ListAllTag
// @Summary list forum all tag
// @Tags forum
// @Produce json
// @Param forum_id path uint false "forum id"
// @Param req query svc.ForumListTagReq false "req params"
// @Success 200 {object} context.Response{data=[]model.ListRes{items=[]model.DiscussionTag}}
// @Router /admin/forum/{forum_id}/tags [get]
func (f *forum) ListAllTag(ctx *context.Context) {
	forumID, err := ctx.ParamUint("forum_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	var req svc.ForumListTagReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := f.svcForum.ListForumAllTag(ctx, forumID, req)
	if err != nil {
		ctx.InternalError(err, "list forum tag failed")
		return
	}

	ctx.Success(res)
}
