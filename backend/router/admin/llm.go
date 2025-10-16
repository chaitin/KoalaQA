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
		g.PUT("/system-prompt", l.UpdateSystemPrompt)
		g.GET("/system-prompt", l.GetSystemPrompt)
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

// @Summary update system chat prompt
// @Description update system chat prompt
// @Tags llm
// @Accept json
// @Produce json
// @Param req body svc.UpdatePromptReq true "update prompt"
// @Success 200 {string} string "success"
// @Router /admin/llm/system-prompt [put]
func (l *llm) UpdateSystemPrompt(ctx *context.Context) {
	var req svc.UpdatePromptReq
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.BadRequest(err)
		return
	}
	err := l.svc.UpdateSystemChatPrompt(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update system prompt failed")
		return
	}
	ctx.Success("success")
}

// @Summary get system chat prompt
// @Description get system chat prompt
// @Tags llm
// @Accept json
// @Produce json
// @Success 200 {string} string "system chat prompt"
// @Router /admin/llm/system-prompt [get]
func (l *llm) GetSystemPrompt(ctx *context.Context) {
	res, err := l.svc.GetSystemChatPrompt(ctx)
	if err != nil {
		ctx.InternalError(err, "get system prompt failed")
		return
	}
	ctx.Success(res)
}
