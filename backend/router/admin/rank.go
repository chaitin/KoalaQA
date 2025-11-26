package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type rank struct {
	svcRank *svc.Rank
}

// AIInsight
// @Summary ai insight rank
// @Tags rank
// @Produce json
// @Success 200 {object} context.Response{data=[]model.RankTimeGroup{items=[]model.RankTimeGroupItem}}
// @Router /admin/rank/ai_insight [get]
func (r *rank) AIInsight(ctx *context.Context) {
	res, err := r.svcRank.AIInsight(ctx)
	if err != nil {
		ctx.InternalError(err, "get ai insight failed")
		return
	}

	ctx.Success(res)
}

func (r *rank) Route(h server.Handler) {
	g := h.Group("/rank")
	g.GET("/ai_insight", r.AIInsight)
}

func newRank(r *svc.Rank) server.Router {
	return &rank{svcRank: r}
}

func init() {
	registerAdminAPIRouter(newRank)
}
