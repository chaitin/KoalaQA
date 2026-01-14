package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type webPlugin struct {
	svcWebPlugin *svc.WebPlugin
}

// Get
// @Summary web plugin detail
// @Tags web_plugin
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemWebPlugin}
// @Router /admin/system/web_plugin [get]
func (w *webPlugin) Get(ctx *context.Context) {
	res, err := w.svcWebPlugin.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get web plugin failed")
		return
	}

	ctx.Success(res)
}

// Put
// @Summary update web plugin config
// @Tags web_plugin
// @Accept json
// @Param req body model.SystemWebPlugin true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/web_plugin [put]
func (w *webPlugin) Put(ctx *context.Context) {
	var req model.SystemWebPlugin
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = w.svcWebPlugin.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update web plugin failed")
		return
	}

	ctx.Success(nil)
}

func (w *webPlugin) Route(h server.Handler) {
	g := h.Group("/system/web_plugin")
	g.GET("", w.Get)
	g.PUT("", w.Put)
}

func newWebPlugin(wp *svc.WebPlugin) server.Router {
	return &webPlugin{svcWebPlugin: wp}
}

func init() {
	registerAdminAPIRouter(newWebPlugin)
}
