package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type userPublic struct {
	svcU     *svc.User
	svcTrend *svc.Trend
}

// Statistics
// @Summary stat user info
// @Tags user
// @Param user_id path uint true "user id"
// @Produce json
// @Success 200 {object} context.Response{data=svc.UserStatisticsRes}
// @Router /user/{user_id} [get]
func (u *userPublic) Statistics(ctx *context.Context) {
	userID, err := ctx.ParamUint("user_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcU.Statistics(ctx, ctx.GetUser().UID, userID)
	if err != nil {
		ctx.InternalError(err, "stat user failed")
		return
	}

	ctx.Success(res)
}

// TrendList
// @Summary list user trend
// @Tags user
// @Param req query svc.TrendListReq true "req params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.Trend}}
// @Router /user/trend [get]
func (u *userPublic) TrendList(ctx *context.Context) {
	var req svc.TrendListReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := u.svcTrend.List(ctx, ctx.GetUser().UID, req)
	if err != nil {
		ctx.InternalError(err, "list trend failed")
		return
	}

	ctx.Success(res)
}

func (u *userPublic) Route(h server.Handler) {
	g := h.Group("/user")
	g.GET("/:user_id", u.Statistics)
	g.GET("/trend", u.TrendList)
}

func newUserPublic(u *svc.User, trend *svc.Trend) server.Router {
	return &userPublic{
		svcU:     u,
		svcTrend: trend,
	}
}

func init() {
	registerApiNoAuthRouter(newUserPublic)
}
