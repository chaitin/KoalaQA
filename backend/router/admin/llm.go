package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type llm struct {
	svc *svc.LLM
}

func newLLM(svcLLM *svc.LLM) server.Router {
	return &llm{
		svc: svcLLM,
	}
}

func init() {
	registerAdminAPIRouter(newLLM)
}

func (l *llm) Route(h server.Handler) {
	{
		g := h.Group("/llm")
		g.POST("/polish", l.Polish)
	}
}

// @Summary polish text
// @Description polish text
// @Tags llm
// @Accept json
// @Produce json
// @Param req body svc.PolishReq true "polish text"
// @Success 200 {string} string "polish text"
// @Router /admin/llm/polish [post]
func (l *llm) Polish(ctx *context.Context) {
	var req svc.PolishReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := l.svc.Polish(ctx, req)
	if err != nil {
		ctx.InternalError(err, "polish failed")
		return
	}
	ctx.Success(res)
}
