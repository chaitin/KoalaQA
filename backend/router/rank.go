package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type rank struct {
	svcRank *svc.Rank
}

// Contribute
// @Summary contribyte rank
// @Tags rank
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.RankContributeItem}}
// @Router /rank/contribute [get]
func (r *rank) Contribute(ctx *context.Context) {
	res, err := r.svcRank.Contribute(ctx)
	if err != nil {
		ctx.InternalError(err, "get contribute failed")
		return
	}

	ctx.Success(res)
}

func (r *rank) Route(h server.Handler) {
	g := h.Group("/rank")
	g.GET("/contribute")
}

func newRank(r *svc.Rank) server.Router {
	return &rank{svcRank: r}
}

func init() {
	registerApiNoAuthRouter(newRank)
}
