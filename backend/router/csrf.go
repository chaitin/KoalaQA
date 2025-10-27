package router

import (
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	ginCsrf "github.com/utrack/gin-csrf"
)

type csrf struct {
	cfg config.Config
}

func (c *csrf) Route(h server.Handler) {
	h.GET("/api/csrf", c.Get)
}

func newCsrf(cfg config.Config) server.Router {
	return &csrf{cfg: cfg}
}

func init() {
	registerGlobalRouter(newCsrf)
}

// Get
// @Summary get csrf
// @Description get csrf
// @Tags csrf
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /csrf [get]
func (c *csrf) Get(ctx *context.Context) {
	if c.cfg.API.FreeCSRF {
		ctx.Success("")
		return
	}
	ctx.Success(ginCsrf.GetToken(ctx.Context))
}
