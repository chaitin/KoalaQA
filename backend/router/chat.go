package router

import (
	"io"
	"net/http"

	chatPkg "github.com/chaitin/koalaqa/pkg/chat"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type chat struct {
	svcChat *svc.Chat
}

func (c *chat) WecomVerify(ctx *context.Context) {
	var req svc.WecomVerifyReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := c.svcChat.StreamText(ctx, chatPkg.TypeWecom, chatPkg.VerifyReq{
		VerifySign: req.VerifySign,
		Content:    req.EchoStr,
		OnlyVerify: true,
	})
	if err != nil {
		ctx.InternalError(err, "verify text failed")
		return
	}

	ctx.String(http.StatusOK, res)
}

func (c *chat) WecomChat(ctx *context.Context) {
	var req chatPkg.VerifySign
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	content, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.InternalError(err, "read body failed")
		return
	}

	res, err := c.svcChat.StreamText(ctx, chatPkg.TypeWecom, chatPkg.VerifyReq{
		VerifySign: req,
		Content:    string(content),
		OnlyVerify: false,
	})
	if err != nil {
		ctx.InternalError(err, "stream chat failed")
		return
	}

	ctx.String(http.StatusOK, res)
}

func (c *chat) Route(h server.Handler) {
	g := h.Group("/chat")

	{
		botG := g.Group("/bot")
		botG.GET("/wecom")
		botG.POST("/wecom")
	}
}

func newChat(c *svc.Chat) server.Router {
	return &chat{svcChat: c}
}

func init() {
	registerApiNoAuthRouter(newChat)
}
