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

func (c *chat) wecomVerify(ctx *context.Context, typ chatPkg.Type) {
	var req svc.WecomVerifyReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := c.svcChat.StreamText(ctx, typ, chatPkg.VerifyReq{
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

func (c *chat) wecomChat(ctx *context.Context, typ chatPkg.Type) {
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

	res, err := c.svcChat.StreamText(ctx, typ, chatPkg.VerifyReq{
		VerifySign: req,
		Content:    string(content),
		OnlyVerify: false,
	})
	if err != nil {
		ctx.InternalError(err, "stream chat failed")
		return
	}

	if typ == chatPkg.TypeWecom {
		ctx.Header("Content-Type", "application/xml; charset=UTF-8")
	}
	ctx.String(http.StatusOK, res)
}

func (c *chat) WecomVerify(ctx *context.Context) {
	c.wecomVerify(ctx, chatPkg.TypeWecom)
}

func (c *chat) WecomChat(ctx *context.Context) {
	c.wecomChat(ctx, chatPkg.TypeWecom)
}

func (c *chat) WecomIntelligentVerify(ctx *context.Context) {
	c.wecomVerify(ctx, chatPkg.TypeWecomIntelligent)
}

func (c *chat) WecomIntelligentChat(ctx *context.Context) {
	c.wecomChat(ctx, chatPkg.TypeWecomIntelligent)
}

func (c *chat) WecomServiceVerify(ctx *context.Context) {
	c.wecomVerify(ctx, chatPkg.TypeWecomService)
}

func (c *chat) WecomServiceChat(ctx *context.Context) {
	c.wecomChat(ctx, chatPkg.TypeWecomService)
}

func (c *chat) WecomServiceAnswer(ctx *context.Context) {

}

func (c *chat) Route(h server.Handler) {
	// g := h.Group("/chat")

	{
		// botG := g.Group("/bot")
		// botG.GET("/wecom", c.WecomVerify)
		// botG.POST("/wecom", c.WecomChat)
		// botG.GET("/wecom_intelligent", c.WecomIntelligentVerify)
		// botG.POST("/wecom_intelligent", c.WecomIntelligentChat)
		// botG.GET("/wecom_service", c.WecomServiceVerify)
		// botG.POST("/wecom_service", c.WecomServiceChat)
		// botG.GET("/wecom/service/answer", c.WecomServiceAnswer)
	}
}

func newChat(c *svc.Chat) server.Router {
	return &chat{svcChat: c}
}

func init() {
	registerApiNoAuthRouter(newChat)
}
