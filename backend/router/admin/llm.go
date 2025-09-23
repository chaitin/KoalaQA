package admin

import (
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type llm struct {
	dev bool
	svc *svc.LLM
}

func newLLM(cfg config.Config, svcLLM *svc.LLM) server.Router {
	return &llm{
		dev: cfg.API.DEV,
		svc: svcLLM,
	}
}

func init() {
	registerAdminAPIRouter(newLLM)
}

func (l *llm) Route(h server.Handler) {
	if !l.dev {
		return
	}

	{
		g := h.Group("/llm")
		g.POST("/generate", l.Generate)
		g.POST("/polish", l.Polish)
	}
}

func (l *llm) Generate(ctx *context.Context) {
	var req svc.GenerateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	res, _, err := l.svc.Answer(ctx, req)
	if err != nil {
		ctx.InternalError(err, "generate failed")
		return
	}
	ctx.Success(res)
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
