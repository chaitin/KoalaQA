package router

import (
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
// @Router /system/web_plugin [get]
func (w *webPlugin) Get(ctx *context.Context) {
	res, err := w.svcWebPlugin.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get web plugin failed")
		return
	}

	ctx.Success(res)
}

func (w *webPlugin) Route(h server.Handler) {
	g := h.Group("/system/web_plugin")
	g.GET("", w.Get)
}

func newWebPlugin(wp *svc.WebPlugin) server.Router {
	return &webPlugin{svcWebPlugin: wp}
}

func init() {
	registerApiNoAuthRouter(newWebPlugin)
}
