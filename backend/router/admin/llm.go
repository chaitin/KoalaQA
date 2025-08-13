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
	}
}

func (l *llm) Generate(ctx *context.Context) {
	var req svc.GenerateReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	res, _, err := l.svc.Chat(ctx, req)
	if err != nil {
		ctx.InternalError(err, "generate failed")
		return
	}
	ctx.Success(res)
}
