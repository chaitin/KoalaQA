package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type webhook struct {
	svcWebhook *svc.Webhook
}

// List
// @Summary list webhook
// @Tags webhook
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.Webhook}}
// @Router /admin/system/webhook [get]
func (w *webhook) List(ctx *context.Context) {
	res, err := w.svcWebhook.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list webhook failed")
	}

	ctx.Success(res)
}

// Create
// @Summary create webhook
// @Tags webhook
// @Accept json
// @Param req body svc.WebhookCreateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/system/webhook [post]
func (w *webhook) Create(ctx *context.Context) {
	var req svc.WebhookCreateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	id, err := w.svcWebhook.Create(ctx, req)
	if err != nil {
		ctx.InternalError(err, "create webhook failed")
		return
	}

	ctx.Success(id)
}

// Get
// @Summary webhook detail
// @Tags webhook
// @Param webhook_id path uint true "wenhook id"
// @Produce json
// @Success 200 {object} context.Response{data=model.WebhookConfig}
// @Router /admin/system/webhook/{webhook_id} [get]
func (w *webhook) Get(ctx *context.Context) {
	webhookID, err := ctx.ParamUint("webhook_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	cfg, err := w.svcWebhook.Get(ctx, webhookID)
	if err != nil {
		ctx.InternalError(err, "get webhook config failed")
		return
	}

	ctx.Success(cfg)
}

// Update
// @Summary update webhook config
// @Tags webhook
// @Accept json
// @Param webhook_id path uint true "wenhook id"
// @Param req body svc.WebhookUpdateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/webhook/{webhook_id} [put]
func (w *webhook) Update(ctx *context.Context) {
	webhookID, err := ctx.ParamUint("webhook_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.WebhookUpdateReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = w.svcWebhook.Update(ctx, webhookID, req)
	if err != nil {
		ctx.InternalError(err, "update webhook config failed")
		return
	}

	ctx.Success(nil)
}

// Delete
// @Summary delete webhook
// @Tags webhook
// @Param webhook_id path uint true "wenhook id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/webhook/{webhook_id} [delete]
func (w *webhook) Delete(ctx *context.Context) {
	webhookID, err := ctx.ParamUint("webhook_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = w.svcWebhook.Delete(ctx, webhookID)
	if err != nil {
		ctx.InternalError(err, "delete webhoo id failed")
		return
	}

	ctx.Success(nil)
}

func (w *webhook) Route(h server.Handler) {
	g := h.Group("/system/webhook")
	g.GET("", w.List)
	g.POST("", w.Create)
	{
		detailG := g.Group("/:webhook_id")
		detailG.GET("", w.Get)
		detailG.PUT("", w.Update)
		detailG.DELETE("", w.Delete)
	}

}

func newWebhook(w *svc.Webhook) server.Router {
	return &webhook{svcWebhook: w}
}

func init() {
	registerAdminAPIRouter(newWebhook)
}
