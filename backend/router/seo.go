package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type seo struct {
	svcSEO *svc.SEO
}

// Get
// @Summary set config detail
// @Tags seo
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemSEO}
// @Router /system/seo [get]
func (s *seo) Get(ctx *context.Context) {
	seo, err := s.svcSEO.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get seo config failed")
		return
	}

	ctx.Success(seo)
}

func (s *seo) Route(h server.Handler) {
	g := h.Group("/system/seo")
	g.GET("", s.Get)
}

func newSEO(s *svc.SEO) server.Router {
	return &seo{svcSEO: s}
}

func init() {
	registerApiRouter(newSEO)
}
