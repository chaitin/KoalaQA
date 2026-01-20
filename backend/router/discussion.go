package router

import (
	"fmt"
	"io"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type discussion struct {
	disc       *svc.Discussion
	discFollow *svc.DiscussionFollow
}

func newDiscussion(svc *svc.Discussion, discFollow *svc.DiscussionFollow) server.Router {
	return &discussion{disc: svc, discFollow: discFollow}
}

func init() {
	registerApiNoAuthRouter(newDiscussion)
}

func (d *discussion) Route(h server.Handler) {
	g := h.Group("/discussion")
	g.GET("", d.List)
	g.POST("/summary", d.Summary)
	g.GET("/:disc_id", d.Detail)
	g.GET("/:disc_id/associate", d.ListAssociate)
	g.GET("/:disc_id/similarity", d.ListSimilarity)
	g.GET("/:disc_id/follow", d.FollowInfo)
	g.POST("/ask", d.Ask)
	g.GET("/ask/:ask_session_id", d.AskHistory)
	g.GET("/ask/session", d.CreateOrLastSession)
	g.POST("/summary/content", d.SummaryByContent)
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
	res, err := d.disc.List(ctx, ctx.SessionUUID(), ctx.GetUser(), req)
	if err != nil {
		ctx.InternalError(err, "failed to list discussions")
		return
	}
	ctx.Success(res)
}

// ListAssociate
// @Summary list associate discussion
// @Description list associate discussion
// @Tags discussion
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.DiscussionListItem}}
// @Router /discussion/{disc_id}/associate [get]
func (d *discussion) ListAssociate(ctx *context.Context) {
	res, err := d.disc.ListAssociateDiscussion(ctx, ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "list associate failed")
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
// @Router /discussion/summary [post]
func (d *discussion) Summary(ctx *context.Context) {
	var req svc.DiscussionSummaryReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	stream, err := d.disc.Summary(ctx, ctx.GetUser().UID, req, false)
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

		ctx.SSEvent("text", fmt.Sprintf("%q", content))
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
// @Produce json
// @Param req query svc.DetailByUUIDReq false "req params"
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=model.DiscussionDetail}
// @Router /discussion/{disc_id} [get]
func (d *discussion) Detail(ctx *context.Context) {
	var req svc.DetailByUUIDReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.DetailByUUID(ctx, ctx.GetUser().UID, ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "failed to detail discussion")
		return
	}
	ctx.Success(res)
}

// FollowInfo
// @Summary get discussion follow info
// @Description get discussion follow info
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=svc.DiscussionListFollowRes}
// @Router /discussion/{disc_id}/follow [get]
func (d *discussion) FollowInfo(ctx *context.Context) {
	res, err := d.discFollow.FollowInfo(ctx, ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "list follow info failed")
	}

	ctx.Success(res)
}

// Ask
// @Summary user ask
// @Description user ask
// @Tags discussion
// @Produce text/event-stream
// @Param req query svc.DiscussionAskReq false "req params"
// @Router /discussion/ask [post]
func (d *discussion) Ask(ctx *context.Context) {
	var req svc.DiscussionAskReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	stream, err := d.disc.Ask(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "get ask stream failed")
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

		if content == "" {
			return true
		}

		ctx.SSEvent("text", fmt.Sprintf("%q", content))
		return true
	})
}

// CreateOrLastSession
// @Summary create or get last session id
// @Description create or get last session id
// @Tags discussion
// @Produce json
// @Param req query svc.CreateOrLastSessionReq false "req params"
// @Success 200 {object} context.Response{data=string}
// @Router /discussion/ask/session [get]
func (d *discussion) CreateOrLastSession(ctx *context.Context) {
	var req svc.CreateOrLastSessionReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.CreateOrLastSession(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "get session failed")
		return
	}

	ctx.Success(res)
}

// AskHistory
// @Summary discussion ask history
// @Description discussion ask history
// @Tags discussion
// @Produce json
// @Param ask_session_id path string true "ask_session_id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.AskSession{summary_discs=[]model.AskSessionSummaryDisc}}}
// @Router /discussion/ask/{ask_session_id} [get]
func (d *discussion) AskHistory(ctx *context.Context) {
	res, err := d.disc.AskHistory(ctx, ctx.Param("ask_session_id"), ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "list history failed")
		return
	}

	ctx.Success(res)
}

// SummaryByContent
// @Summary content summary
// @Description content summary
// @Tags discussion
// @Produce text/event-stream
// @Param req query svc.SummaryByContentReq false "req params"
// @Router /discussion/summary/content [post]
func (d *discussion) SummaryByContent(ctx *context.Context) {
	var req svc.SummaryByContentReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	stream, err := d.disc.SummaryByContent(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "summary failed")
		return
	}
	defer stream.Close()

	ctx.Writer.Header().Set("X-Accel-Buffering", "no")
	ctx.Stream(func(_ io.Writer) bool {
		data, ok := stream.Text(ctx)
		if !ok {
			ctx.SSEvent("end", true)
			return false
		}

		if data.Type == "text" {
			ctx.SSEvent(data.Type, fmt.Sprintf("%q", data.Content))
		} else {
			ctx.SSEvent(data.Type, data.Content)
		}

		return true
	})
}
