package admin

import (
	"github.com/chaitin/koalaqa/model"
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
// @Router /admin/system/brand [get]
func (b *brand) Get(ctx *context.Context) {
	res, err := b.svcBrand.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get brand failed")
		return
	}

	ctx.Success(res)
}

// Put
// @Summary update brand config
// @Tags brand
// @Accept json
// @Param req body model.SystemBrand true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/brand [put]
func (b *brand) Put(ctx *context.Context) {
	var req model.SystemBrand
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = b.svcBrand.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update brand failed")
		return
	}

	ctx.Success(nil)
}

func (b *brand) Route(h server.Handler) {
	g := h.Group("/system/brand")
	g.GET("", b.Get)
	g.PUT("", b.Put)
}

func newBrand(b *svc.Brand) server.Router {
	return &brand{svcBrand: b}
}

func init() {
	registerAdminAPIRouter(newBrand)
}
