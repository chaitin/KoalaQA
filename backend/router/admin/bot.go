package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type bot struct {
	svcBot *svc.Bot
}

// Set
// @Summary set bot info
// @Tags bot
// @Accept multipart/form-data
// @Param avatar formData file false "upload avatar"
// @Param req formData svc.BotSetReq true "bot info"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/bot [put]
func (b *bot) Set(ctx *context.Context) {
	var req svc.BotSetReq
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = b.svcBot.Set(ctx, req)
	if err != nil {
		ctx.InternalError(err, "set bot info failed")
		return
	}

	ctx.Success(nil)
}

// Get
// @Summary get bot info
// @Tags bot
// @Produce json
// @Success 200 {object} context.Response{data=svc.BotGetRes}
// @Router /admin/bot [get]
func (b *bot) Get(ctx *context.Context) {
	res, err := b.svcBot.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get bot failed")
		return
	}

	ctx.Success(res)
}

func (b *bot) Route(h server.Handler) {
	g := h.Group("/bot")
	g.GET("", b.Get)
	g.PUT("", b.Set)
}

func newBot(b *svc.Bot) server.Router {
	return &bot{svcBot: b}
}

func init() {
	registerAdminAPIRouter(newBot)
}
