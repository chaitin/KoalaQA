package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type bot struct {
	svcBot *svc.Bot
}

// Get
// @Summary get bot info
// @Tags bot
// @Produce json
// @Success 200 {object} context.Response{data=svc.BotGetRes}
// @Router /bot [get]
func (b *bot) Get(ctx *context.Context) {
	res, err := b.svcBot.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get bot failed")
		return
	}

	res.UnknownPrompt = ""
	ctx.Success(res)
}

func (b *bot) Route(h server.Handler) {
	g := h.Group("/bot")
	g.GET("", b.Get)
}

func newBot(b *svc.Bot) server.Router {
	return &bot{svcBot: b}
}

func init() {
	registerApiNoAuthRouter(newBot)
}
