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

// ListAIInsightDiscussion
// @Summary list ai insight discussion
// @Tags rank
// @Produce json
// @Param ai_insight_id path uint true "ai_insight_id"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.AIInsightDiscussionItem}}
// @Router /admin/rank/ai_insight/{ai_insight_id}/discussion [get]
func (r *rank) ListAIInsightDiscussion(ctx *context.Context) {
	aiInsightID, err := ctx.ParamUint("ai_insight_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := r.svcRank.AIInsightDiscussion(ctx, aiInsightID)
	if err != nil {
		ctx.InternalError(err, "list ai insight discussion failed")
		return
	}

	ctx.Success(res)
}

func (r *rank) Route(h server.Handler) {
	g := h.Group("/rank")
	g.GET("/ai_insight", r.AIInsight)
	g.GET("/ai_insight/:ai_insight_id/discussion", r.ListAIInsightDiscussion)
}

func newRank(r *svc.Rank) server.Router {
	return &rank{svcRank: r}
}

func init() {
	registerAdminAPIRouter(newRank)
}
