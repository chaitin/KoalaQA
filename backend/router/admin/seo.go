package admin

import (
	"github.com/chaitin/koalaqa/model"
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
// @Router /admin/system/seo [get]
func (s *seo) Get(ctx *context.Context) {
	seo, err := s.svcSEO.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get seo config failed")
		return
	}

	ctx.Success(seo)
}

// Update
// @Summary update seo config
// @Tags seo
// @Accept json
// @Param req body model.SystemSEO true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/seo [put]
func (s *seo) Update(ctx *context.Context) {
	var req model.SystemSEO
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcSEO.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update public address failed")
		return
	}

	ctx.Success(nil)
}

func (s *seo) Route(h server.Handler) {
	g := h.Group("/system/seo")
	g.GET("", s.Get)
	g.PUT("", s.Update)
}

func newSEO(s *svc.SEO) server.Router {
	return &seo{svcSEO: s}
}

func init() {
	registerAdminAPIRouter(newSEO)
}
