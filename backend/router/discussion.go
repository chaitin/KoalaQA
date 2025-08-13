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
	{
		g.GET("", d.List)
		g.POST("", d.Create)
		g.PUT("/:disc_id", d.Update)
		g.DELETE("/:disc_id", d.Delete)
		g.GET("/:disc_id", d.Detail)
		g.POST("/search", d.Search)
		g.POST("/upload", d.UploadFile)
	}

	{
		comG := g.Group("/:disc_id/comment")
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

// List
// @Summary list discussions
// @Description list discussions
// @Tags discussion
// @Accept json
// @Produce json
// @Param page query int false "page"
// @Param size query int false "size"
// @Param keyword query string false "keyword"
// @Param type query model.DiscussionType false "type"
// @Param filter query svc.DiscussionListFilter false "filter"
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

// Create
// @Summary create discussion
// @Description create discussion
// @Tags discussion
// @Accept json
// @Produce json
// @Param discussion body svc.DiscussionCreateReq true "discussion"
// @Success 200 {object} context.Response{data=uint}
// @Router /discussion [post]
func (d *discussion) Create(ctx *context.Context) {
	var req svc.DiscussionCreateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	req.UserID = ctx.GetUser().UID
	res, err := d.disc.Create(ctx.Request.Context(), req)
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
func (d *discussion) Update(ctx *context.Context) {
	var req svc.DiscussionUpdateReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.Update(ctx.Request.Context(), ctx.Param("disc_id"), req)
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
func (d *discussion) Delete(ctx *context.Context) {
	err := d.disc.Delete(ctx.Request.Context(), ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to delete discussion")
		return
	}
	ctx.Success(nil)
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
	res, err := d.disc.Detail(ctx.Request.Context(), ctx.GetUser().UID, ctx.Param("disc_id"))
	if err != nil {
		ctx.InternalError(err, "failed to detail discussion")
		return
	}
	ctx.Success(res)
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
func (d *discussion) CreateComment(ctx *context.Context) {
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
// @Param comment body svc.CommentUpdateReq true "comment"
// @Success 200 {object} context.Response{data=any}
// @Router /discussion/{disc_id}/comment/{comment_id} [put]
func (d *discussion) UpdateComment(ctx *context.Context) {
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
	err = d.disc.UpdateComment(ctx.Request.Context(), ctx.GetUser().UID, ctx.Param("disc_id"), commentID, req)
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
func (d *discussion) DeleteComment(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	err = d.disc.DeleteComment(ctx.Request.Context(), ctx.GetUser().UID, ctx.Param("disc_id"), commentID)
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
func (d *discussion) LikeComment(ctx *context.Context) {
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
func (d *discussion) DislikeComment(ctx *context.Context) {
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
func (d *discussion) RevokeCommentLike(ctx *context.Context) {
	commentID, err := ctx.ParamUint("comment_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.disc.RevokeLike(ctx, ctx.GetUser().UID, commentID)
	if err != nil {
		ctx.InternalError(err, "dislike comment failed")
		return
	}

	ctx.Success(nil)
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
func (d *discussion) UploadFile(ctx *context.Context) {
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
func (d *discussion) AcceptComment(ctx *context.Context) {
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
