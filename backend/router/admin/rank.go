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

// ListHotQuestion
// @Summary hot question rank
// @Tags rank
// @Produce json
// @Param req query svc.ListHotQuestionReq true "req param"
// @Success 200 {object} context.Response{data=[]model.RankTimeGroup{items=[]model.RankTimeGroupItem}}
// @Router /admin/rank/hot_question [get]
func (r *rank) ListHotQuestion(ctx *context.Context) {
	var req svc.ListHotQuestionReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := r.svcRank.ListHotQuesion(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list hot quesion failed")
		return
	}

	ctx.Success(res)
}

// ListHotQuesionItem
// @Summary list hot quesion item
// @Tags rank
// @Produce json
// @Param hot_question_id path uint true "hot_question_id"
// @Param req query svc.ListHotQuestionItemReq true "req param"
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.HotQuestion}}
// @Router /admin/rank/hot_question/{hot_question_id} [get]
func (r *rank) ListHotQuesionItem(ctx *context.Context) {
	hotQuestionID, err := ctx.ParamUint("hot_question_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.ListHotQuestionItemReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := r.svcRank.ListHostQuesionItem(ctx, hotQuestionID, req)
	if err != nil {
		ctx.InternalError(err, "list host quesion item failed")
		return
	}

	ctx.Success(res)
}

func (r *rank) Route(h server.Handler) {
	g := h.Group("/rank")
	g.GET("/ai_insight", r.AIInsight)
	g.GET("/ai_insight/:ai_insight_id/discussion", r.ListAIInsightDiscussion)
	g.GET("/hot_question", r.ListHotQuestion)
	g.GET("/hot_question/:hot_question_id", r.ListHotQuesionItem)
}

func newRank(r *svc.Rank) server.Router {
	return &rank{svcRank: r}
}

func init() {
	registerAdminAPIRouter(newRank)
}
