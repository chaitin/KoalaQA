package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type chat struct {
	svcChat *svc.Chat
}

// Set
// @Summary set chat info
// @Tags chat
// @Accept json
// @Param req body model.SystemChat true "chat info"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/chat [put]
func (c *chat) Set(ctx *context.Context) {
	var req model.SystemChat
	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = c.svcChat.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "set chat info failed")
		return
	}

	ctx.Success(nil)
}

// Get
// @Summary get chat info
// @Tags chat
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemChat}
// @Router /admin/chat [get]
func (c *chat) Get(ctx *context.Context) {
	res, err := c.svcChat.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get bot failed")
		return
	}

	ctx.Success(res)
}

func (c *chat) Route(h server.Handler) {
	g := h.Group("/chat")
	g.GET("", c.Get)
	g.PUT("", c.Set)
}

func newChat(c *svc.Chat) server.Router {
	return &chat{svcChat: c}
}

func init() {
	registerAdminAPIRouter(newChat)
}
