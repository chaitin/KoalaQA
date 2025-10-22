package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type brand struct {
	svcBrand *svc.Brand
}

// Get
// @Summary brand detail
// @Tags brand
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemBrand}
// @Router /system/brand [get]
func (b *brand) Get(ctx *context.Context) {
	res, err := b.svcBrand.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get brand failed")
		return
	}

	ctx.Success(res)
}

func (b *brand) Route(h server.Handler) {
	g := h.Group("/system/brand")
	g.GET("", b.Get)
}

func newBrand(b *svc.Brand) server.Router {
	return &brand{svcBrand: b}
}

func init() {
	registerApiNoAuthRouter(newBrand)
}
