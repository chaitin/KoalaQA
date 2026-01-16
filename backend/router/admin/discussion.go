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
	g.GET("/ask", d.ListAsks)
	g.GET("/ask/session", d.AskSession)
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

func (d *discussion) Reindex(ctx *context.Context) {
	var req svc.ReindexReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.Reindex(ctx, req)
	if err != nil {
		ctx.InternalError(err, "reindex discussion failed")
		return
	}

	ctx.Success(nil)
}

// ListAsks
// @Summary backend ask session group
// @Description backend ask session group
// @Tags discussion
// @Produce json
// @Param req query svc.ListAsksReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.ListAsksRes}}
// @Router /admin/discussion/ask [get]
func (d *discussion) ListAsks(ctx *context.Context) {
	var req svc.ListAsksReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.ListAsks(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list asks failed")
		return
	}

	ctx.Success(res)
}

// AskSession
// @Summary backend ask session
// @Description backend ask session
// @Tags discussion
// @Produce json
// @Param req query svc.AskSessionReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.AskSession{summary_discs=[]model.AskSessionSummaryDisc}}}
// @Router /admin/discussion/ask/session [get]
func (d *discussion) AskSession(ctx *context.Context) {
	var req svc.AskSessionReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.AskSession(ctx, req)
	if err != nil {
		ctx.InternalError(err, "get ask session failed")
		return
	}

	ctx.Success(res)
}
