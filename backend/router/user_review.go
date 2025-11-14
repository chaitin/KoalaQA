package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type userReview struct {
	svcReview *svc.UserReview
}

// GuestCreate
// @Summary create guest review
// @Tags user_review
// @Accept json
// @Param req body svc.UserReviewGuestCreateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /user/review/guest [post]
func (u *userReview) GuestCreate(ctx *context.Context) {
	var req svc.UserReviewGuestCreateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcReview.GuestCreate(ctx, ctx.GetUser(), req)
	if err != nil {
		ctx.InternalError(err, "guest review create failed")
		return
	}

	ctx.Success(nil)
}

func (u *userReview) Route(h server.Handler) {
	g := h.Group("/user/review")
	g.POST("/guest", u.GuestCreate)
}

func newUserReview(review *svc.UserReview) server.Router {
	return &userReview{svcReview: review}
}

func init() {
	registerApiAuthRouter(newUserReview)
}
