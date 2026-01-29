package router

import (
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/server"
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
	if c.cfg.API.FreeCSRF || ctx.GetUser().Salt == "" {
		ctx.Success("")
		return
	}
	ctx.Success(util.Sha1(c.cfg.API.CSRFSecret + "-" + ctx.GetUser().Salt))
}
