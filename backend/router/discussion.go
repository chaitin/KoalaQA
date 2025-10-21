package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type discussion struct {
	disc *svc.Discussion
}

func newDiscussion(svc *svc.Discussion) server.Router {
	return &discussion{disc: svc}
}

func init() {
	registerApiNoAuthRouter(newDiscussion)
}

func (d *discussion) Route(h server.Handler) {
	g := h.Group("/discussion")
	g.GET("", d.List)
	g.GET("/:disc_id", d.Detail)
	g.POST("/search", d.Search)
}

// List
// @Summary list discussions
// @Description list discussions
// @Tags discussion
// @Produce json
// @Param req query svc.DiscussionListReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.DiscussionListItem}}
// @Router /discussion [get]
func (d *discussion) List(ctx *context.Context) {
	var req svc.DiscussionListReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.disc.List(ctx.Request.Context(), ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "failed to list discussions")
		return
	}
	ctx.Success(res)
}

// Detail
// @Summary detail discussion
// @Description detail discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=model.DiscussionDetail}
// @Router /discussion/{disc_id} [get]
func (d *discussion) Detail(ctx *context.Context) {
	res, err := d.disc.DetailByUUID(ctx.Request.Context(), ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to detail discussion")
		return
	}
	ctx.Success(res)
}

// Search
// @Summary search discussion
// @Description search discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param discussion body svc.DiscussionSearchReq true "discussion"
// @Success 200 {object} context.Response{data=[]model.Discussion}
// @Router /discussion/search [post]
func (d *discussion) Search(ctx *context.Context) {
	var req svc.DiscussionSearchReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.disc.Search(ctx.Request.Context(), req)
	if err != nil {
		ctx.InternalError(err, "failed to search discussion")
		return
	}
	ctx.Success(res)
}
