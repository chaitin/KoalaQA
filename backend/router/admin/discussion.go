package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type discussion struct {
	disc *svc.Discussion
}

func (d *discussion) Route(h server.Handler) {
	g := h.Group("/discussion")
	g.GET("", d.List)
	g.POST("/reindex", d.Reindex)
}

func newDiscussion(disc *svc.Discussion) server.Router {
	return &discussion{disc: disc}
}

func init() {
	registerAdminAPIRouter(newDiscussion)
}

// List
// @Summary backend list discussions
// @Description backend list discussions
// @Tags discussion
// @Produce json
// @Param req query svc.DiscussionListBackendReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.DiscussionListItem}}
// @Router /admin/discussion [get]
func (d *discussion) List(ctx *context.Context) {
	var req svc.DiscussionListBackendReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.ListBackend(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list discussion failed")
		return
	}

	ctx.Success(res)
}

// Reindex
// @Summary trigger discussion reindex
// @Description iterate all discussions and publish reindex messages
// @Tags discussion
// @Produce json
// @Success 200 {object} context.Response{data=svc.DiscussionReindexRes}
// @Router /admin/discussion/reindex [post]
func (d *discussion) Reindex(ctx *context.Context) {
	res, err := d.disc.Reindex(ctx)
	if err != nil {
		ctx.InternalError(err, "reindex discussion failed")
		return
	}

	ctx.Success(res)
}
