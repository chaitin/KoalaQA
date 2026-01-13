package router

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/google/uuid"
)

type discussionAuth struct {
	disc       *svc.Discussion
	discFollow *svc.DiscussionFollow
	kbDoc      *svc.KBDocument
}

func newDiscussionAuth(svc *svc.Discussion, discFollow *svc.DiscussionFollow, kbDoc *svc.KBDocument) server.Router {
	return &discussionAuth{disc: svc, discFollow: discFollow, kbDoc: kbDoc}
}

func init() {
	registerApiNotGuestRouter(newDiscussionAuth)
}

func (d *discussionAuth) Route(h server.Handler) {
	g := h.Group("/discussion")
	g.POST("", d.Create)
	g.POST("/content_summary", d.ContentSummary)
	g.GET("/follow", d.ListFollow)
	g.POST("/complete", d.Complete)
	g.POST("/upload", d.UploadFile)
	g.POST("/ask", d.Ask)
	g.POST("/summary/content", d.SummaryByContent)
	g.GET("/ask/session", d.AskSession)
	g.POST("/ask/session", d.DeleteAskSession)

	{
		detailG := g.Group("/:disc_id")
		detailG.PUT("", d.Update)
		detailG.DELETE("", d.Delete)
		detailG.POST("/like", d.LikeDiscussion)
		detailG.POST("/revoke_like", d.RevokeLikeDiscussion)
		detailG.POST("/resolve", d.ResolveFeedback)
		detailG.PUT("/close", d.CloseDiscussion)
		detailG.POST("/resolve_issue", d.ResolveIssue)
		detailG.POST("/requirement", d.Requirement)
		detailG.POST("/associate", d.Associate)
		detailG.POST("/follow", d.Follow)
		detailG.DELETE("/follow", d.Unfollow)
		detailG.POST("/ai_learn", d.AILearn)

		{
			comG := detailG.Group("/comment")
			comG.Handle("POST", "", d.CreateComment)
			{
				comDetailG := comG.Group("/:comment_id")
				comDetailG.PUT("", d.UpdateComment)
				comDetailG.DELETE("", d.DeleteComment)
				comDetailG.POST("/like", d.LikeComment)
				comDetailG.POST("/dislike", d.DislikeComment)
				comDetailG.POST("/revoke_like", d.RevokeCommentLike)
				comDetailG.POST("/accept", d.AcceptComment)
			}
		}
	}

}

// Create
// @Summary create discussion
// @Description create discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param discussion body svc.DiscussionCreateReq true "discussion"
// @Success 200 {object} context.Response{data=string}
// @Router /discussion [post]
func (d *discussionAuth) Create(ctx *context.Context) {
	var req svc.DiscussionCreateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.disc.Create(ctx.Request.Context(), ctx.GetUser(), req)
	if err != nil {
		ctx.InternalError(err, "failed to create discussion")
		return
	}
	ctx.Success(res)
}

// Update
// @Summary update discussion
// @Description update discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param discussion body svc.DiscussionUpdateReq true "discussion"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id} [put]
func (d *discussionAuth) Update(ctx *context.Context) {
	var req svc.DiscussionUpdateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.Update(ctx.Request.Context(), ctx.GetUser(), ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "failed to update discussion")
		return
	}
	ctx.Success(nil)
}

// Delete
// @Summary delete discussion
// @Description delete discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id} [delete]
func (d *discussionAuth) Delete(ctx *context.Context) {
	err := d.disc.Delete(ctx.Request.Context(), ctx.GetUser(), ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to delete discussion")
		return
	}
	ctx.Success(nil)
}

// LikeDiscussion
// @Summary like discussion
// @Description like discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/like [post]
func (d *discussionAuth) LikeDiscussion(ctx *context.Context) {
	err := d.disc.LikeDiscussion(ctx.Request.Context(), ctx.Param("disc_id"), ctx.GetUser())
	if err != nil {
		ctx.InternalError(err, "failed to like discussion")
		return
	}
	ctx.Success(nil)
}

// RevokeLikeDiscussion
// @Summary revoke like discussion
// @Description revoke like discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/revoke_like [post]
func (d *discussionAuth) RevokeLikeDiscussion(ctx *context.Context) {
	err := d.disc.RevokeLikeDiscussion(ctx.Request.Context(), ctx.Param("disc_id"), ctx.GetUser().UID)
	if err != nil {
		ctx.InternalError(err, "failed to revoke like discussion")
		return
	}
	ctx.Success(nil)
}

// CloseDiscussion
// @Summary close discussion
// @Description close discussion
// @Tags discussion
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/close [put]
func (d *discussionAuth) CloseDiscussion(ctx *context.Context) {
	err := d.disc.Close(ctx, ctx.GetUser(), ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to close discussion")
		return
	}

	ctx.Success(nil)
}

// CreateComment
// @Summary create comment
// @Description create comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment body svc.CommentCreateReq true "comment"
// @Success 200 {object} context.Response{data=uint}
// @Router /discussion/{disc_id}/comment [post]
func (d *discussionAuth) CreateComment(ctx *context.Context) {
	var req svc.CommentCreateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.disc.CreateComment(ctx.Request.Context(), ctx.GetUser().UID, ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "failed to create comment")
		return
	}
	ctx.Success(res)
}

// UpdateComment
// @Summary update comment
// @Description update comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path number true "comment_id"
// @Param comment body svc.CommentUpdateReq true "comment"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/comment/{comment_id} [put]
func (d *discussionAuth) UpdateComment(ctx *context.Context) {
	var req svc.CommentUpdateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.UpdateComment(ctx.Request.Context(), ctx.GetUser(), ctx.Param("disc_id"), commentID, req)
	if err != nil {
		ctx.InternalError(err, "failed to update comment")
		return
	}
	ctx.Success(nil)
}

// DeleteComment
// @Summary delete comment
// @Description delete comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path int true "comment_id"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/comment/{comment_id} [delete]
func (d *discussionAuth) DeleteComment(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.DeleteComment(ctx.Request.Context(), ctx.GetUser(), ctx.Param("disc_id"), commentID)
	if err != nil {
		ctx.InternalError(err, "failed to delete comment")
		return
	}
	ctx.Success(nil)
}

// LikeComment
// @Summary like comment
// @Description like comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path int true "comment_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/comment/{comment_id}/like [post]
func (d *discussionAuth) LikeComment(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.LikeComment(ctx, ctx.GetUser(), ctx.Param("disc_id"), commentID)
	if err != nil {
		ctx.InternalError(err, "like comment failed")
		return
	}
	ctx.Success(nil)
}

// DislikeComment
// @Summary dislike comment
// @Description dislike comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path int true "comment_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/comment/{comment_id}/dislike [post]
func (d *discussionAuth) DislikeComment(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.DislikeComment(ctx, ctx.GetUser(), ctx.Param("disc_id"), commentID)
	if err != nil {
		ctx.InternalError(err, "dislike comment failed")
		return
	}

	ctx.Success(nil)
}

// RevokeCommentLike
// @Summary revoke comment like
// @Description revoke comment like
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path int true "comment_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/comment/{comment_id}/revoke_like [post]
func (d *discussionAuth) RevokeCommentLike(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.RevokeLike(ctx, ctx.GetUser().UID, ctx.Param("disc_id"), commentID)
	if err != nil {
		ctx.InternalError(err, "dislike comment failed")
		return
	}

	ctx.Success(nil)
}

// Complete
// @Summary tab complete
// @Description tab complete
// @Tags discussion
// @Accept json
// @Param req body svc.DiscussionCompeletReq true "req params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /discussion/complete [post]
func (d *discussionAuth) Complete(ctx *context.Context) {
	var req svc.DiscussionCompeletReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.Complete(ctx, req)
	if err != nil {
		ctx.InternalError(err, "tab complete failed")
		return
	}

	ctx.Success(res)
}

// ResolveFeedback
// @Summary resolve feedback
// @Description resolve feedback
// @Tags discussion
// @Accept json
// @Param req body svc.ResolveFeedbackReq true "req params"
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/resolve [post]
func (d *discussionAuth) ResolveFeedback(ctx *context.Context) {
	var req svc.ResolveFeedbackReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.ResolveFeedback(ctx, ctx.GetUser(), ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "close feedback failed")
		return
	}

	ctx.Success(nil)
}

// ResolveIssue
// @Summary resolve issue
// @Description resolve issue
// @Tags discussion
// @Accept json
// @Param req body svc.ResolveIssueReq true "req params"
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/resolve_issue [post]
func (d *discussionAuth) ResolveIssue(ctx *context.Context) {
	var req svc.ResolveIssueReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.ResolveIssue(ctx, ctx.GetUser(), ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "resolve issue failed")
		return
	}

	ctx.Success(nil)
}

// UploadFile
// @Summary discussion upload file
// @Description discussion upload file
// @Tags discussion
// @Accept multipart/formdata
// @Param req body svc.DiscussUploadFileReq true "request params"
// @Param file formData file true "upload file"
// @Produce json
// @Success 200 {object} context.Response
// @Router /discussion/upload [post]
func (d *discussionAuth) UploadFile(ctx *context.Context) {
	var req svc.DiscussUploadFileReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	path, err := d.disc.UploadFile(ctx, req)
	if err != nil {
		ctx.InternalError(err, "upload file failed")
		return
	}

	ctx.Success(path)
}

// AcceptComment
// @Summary accept comment
// @Description accept comment
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param comment_id path int true "comment_id"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/comment/{comment_id}/accept [post]
func (d *discussionAuth) AcceptComment(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.AcceptComment(ctx, ctx.GetUser(), ctx.Param("disc_id"), commentID)
	if err != nil {
		ctx.InternalError(err, "accept comment failed")
		return
	}
	ctx.Success(nil)
}

// Associate
// @Summary associate discussion
// @Description associate discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Param discussion body svc.AssociateDiscussionReq true "discussion"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/associate [post]
func (d *discussionAuth) Associate(ctx *context.Context) {
	var req svc.AssociateDiscussionReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.AssociateDiscussion(ctx, ctx.GetUser(), ctx.Param("disc_id"), req)
	if err != nil {
		ctx.InternalError(err, "associate discussion failed")
		return
	}

	ctx.Success(nil)
}

// Requirement
// @Summary discussion requirement
// @Description discussion requirement
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=string}
// @Router /discussion/{disc_id}/requirement [post]
func (d *discussionAuth) Requirement(ctx *context.Context) {
	res, err := d.disc.DiscussionRequirement(ctx, ctx.GetUser(), ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "get discussion requirement failed")
		return
	}

	ctx.Success(res)
}

// ListFollow
// @Summary list follow discussions
// @Description list follow discussions
// @Tags discussion
// @Produce json
// @Param req query svc.ListDiscussionFollowReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.Discussion}}
// @Router /discussion/follow [get]
func (d *discussionAuth) ListFollow(ctx *context.Context) {
	var req svc.ListDiscussionFollowReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.discFollow.ListDiscussion(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "list follow discussion failed")
		return
	}

	ctx.Success(res)
}

// Follow
// @Summary follow discussion
// @Description follow discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response{data=uint}
// @Router /discussion/{disc_id}/follow [post]
func (d *discussionAuth) Follow(ctx *context.Context) {
	res, err := d.discFollow.Follow(ctx, ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "follow discussion failed")
		return
	}

	ctx.Success(res)
}

// Unfollow
// @Summary unfollow discussion
// @Description unfollow discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/follow [delete]
func (d *discussionAuth) Unfollow(ctx *context.Context) {
	err := d.discFollow.Unfollow(ctx, ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "unfollow discussion failed")
		return
	}

	ctx.Success(nil)
}

// ContentSummary
// @Summary discussion content summary
// @Description discussion content summary
// @Tags discussion
// @Accept json
// @Produce json
// @Param req body svc.DiscussionContentSummaryReq true "req params"
// @Success 200 {object} context.Response{data=string}
// @Router /discussion/content_summary [post]
func (d *discussionAuth) ContentSummary(ctx *context.Context) {
	var req svc.DiscussionContentSummaryReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.disc.ContentSummary(ctx, req)
	if err != nil {
		ctx.InternalError(err, "summary content failed")
		return
	}

	ctx.Success(res)
}

// AILearn
// @Summary discussion ai learn
// @Description discussion ai learn
// @Tags discussion
// @Produce json
// @Param disc_id path string true "disc_id"
// @Success 200 {object} context.Response
// @Router /discussion/{disc_id}/ai_learn [post]
func (d *discussionAuth) AILearn(ctx *context.Context) {
	err := d.kbDoc.CreateDocByDisc(ctx, ctx.GetUser(), ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "discussion ai learn failed")
		return
	}

	ctx.Success(nil)
}

const askSessionID = "koala_ask_session_id"

// AskSession
// @Summary get ask session
// @Description get ask session
// @Tags discussion
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /discussion/ask/session [get]
func (d *discussionAuth) AskSession(ctx *context.Context) {
	sessionUUID := uuid.NewString()

	str, err := ctx.Cookie(askSessionID)
	if err != nil {
		ctx.SetSameSite(http.SameSiteNoneMode)
		ctx.SetCookie(askSessionID, sessionUUID, 86400, "/", "", false, true)
	} else {
		sessionUUID = str
	}

	ctx.Success(sessionUUID)
}

// DeleteAskSession
// @Summary delete ask session
// @Description delete ask session
// @Tags discussion
// @Produce json
// @Success 200 {object} context.Response
// @Router /discussion/ask/session [post]
func (d *discussionAuth) DeleteAskSession(ctx *context.Context) {
	ctx.SetSameSite(http.SameSiteNoneMode)
	ctx.SetCookie(askSessionID, "", -1, "/", "", false, true)

	ctx.Success(nil)
}

// Ask
// @Summary user ask
// @Description user ask
// @Tags discussion
// @Produce text/event-stream
// @Param req query svc.DiscussionAskReq false "req params"
// @Router /discussion/ask [post]
func (d *discussionAuth) Ask(ctx *context.Context) {
	var req svc.DiscussionAskReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	seesionID, err := ctx.Cookie(askSessionID)
	if err != nil || seesionID == "" {
		ctx.BadRequest(errors.New("no session"))
		return
	}

	stream, err := d.disc.Ask(ctx, seesionID, ctx.GetUser().UID, req)
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

		ctx.SSEvent("text", fmt.Sprintf("%q", content))
		return true
	})
}

// SummaryByContent
// @Summary content summary
// @Description content summary
// @Tags discussion
// @Produce text/event-stream
// @Param req query svc.SummaryByContentReq false "req params"
// @Router /discussion/summary/content [post]
func (d *discussionAuth) SummaryByContent(ctx *context.Context) {
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

	ctx.Writer.Header().Set("X-Accel-Buffering", "no")
	if stream != nil {
		defer stream.Close()
	}

	ctx.Stream(func(_ io.Writer) bool {
		if stream == nil {
			ctx.SSEvent("no_disc", true)
			return false
		}

		content, ok := stream.Text(ctx)
		if !ok {
			ctx.SSEvent("end", true)
			return false
		}

		ctx.SSEvent("text", fmt.Sprintf("%q", content))
		return true
	})
}
