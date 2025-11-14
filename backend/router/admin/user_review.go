package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type userReview struct {
	svcReview *svc.UserReview
}

// List
// @Summary list user review
// @Description list user review
// @Tags user_review
// @Produce json
// @Param req query svc.UserReviewListReq false "req params"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.UserReviewWithUser}}
// @Router /admin/user/review [get]
func (u *userReview) List(ctx *context.Context) {
	var req svc.UserReviewListReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcReview.List(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list review failed")
		return
	}

	ctx.Success(res)
}

// Update
// @Summary update user review
// @Description update user review
// @Tags user_review
// @Accept json
// @Param req body svc.UserReviewUpdateReq true "request params"
// @Produce json
// @Param review_id path string true "review id"
// @Success 200 {object} context.Response
// @Router /admin/user/review/{review_id} [put]
func (u *userReview) Update(ctx *context.Context) {
	reviewID, err := ctx.ParamUint("review_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UserReviewUpdateReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcReview.Update(ctx, ctx.GetUser().UID, reviewID, req)
	if err != nil {
		ctx.InternalError(err, "update review failed")
		return
	}

	ctx.Success(nil)
}

func (u *userReview) Route(h server.Handler) {
	g := h.Group("/user/review")
	g.GET("", u.List)
	{
		detailG := g.Group("/:review_id")
		detailG.PUT("", u.Update)
	}
}

func newUserReview(review *svc.UserReview) server.Router {
	return &userReview{svcReview: review}
}

func init() {
	registerAdminAPIRouter(newUserReview)
}
