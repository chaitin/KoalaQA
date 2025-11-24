package router

import (
	"io"

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
	g.GET("/summary", d.Summary)
	g.GET("/:disc_id", d.Detail)
	g.GET("/:disc_id/similarity", d.ListSimilarity)
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
	res, err := d.disc.List(ctx, ctx.SessionUUID(), ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "failed to list discussions")
		return
	}
	ctx.Success(res)
}

// Summary
// @Summary discussions summary
// @Description discussions summary
// @Tags discussion
// @Produce text/event-stream
// @Param req query svc.DiscussionSummaryReq false "req params"
// @Router /discussion/summary [get]
func (d *discussion) Summary(ctx *context.Context) {
	var req svc.DiscussionSummaryReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	stream, err := d.disc.Summary(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "get summary stream failed")
		return
	}
	defer stream.Close()

	ctx.Writer.Header().Set("X-Accel-Buffering", "no")

	ctx.Stream(func(_ io.Writer) bool {
		content, ok := stream.Text(ctx)
		if !ok {
			ctx.SSEvent("end", true)
			return false
		}

		ctx.SSEvent("text", content)
		return true
	})
}

// ListSimilarity
// @Summary list similarity discussion
// @Description list similarity discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.DiscussionListItem}}
// @Router /discussion/{disc_id}/similarity [get]
func (d *discussion) ListSimilarity(ctx *context.Context) {
	res, err := d.disc.ListSimilarity(ctx, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "list similarity failed")
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
	res, err := d.disc.DetailByUUID(ctx, ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to detail discussion")
		return
	}
	ctx.Success(res)
}
