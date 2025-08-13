package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type publicAddress struct {
	svcPublicAddr *svc.PublicAddress
}

// Get
// @Summary public_address detail
// @Tags public_address
// @Produce json
// @Success 200 {object} context.Response{data=model.PublicAddress}
// @Router /admin/system/public_address [get]
func (p *publicAddress) Get(ctx *context.Context) {
	publicAddr, err := p.svcPublicAddr.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get public address failed")
		return
	}

	ctx.Success(publicAddr)
}

// Update
// @Summary update public_address config
// @Tags public_address
// @Accept json
// @Param req body model.PublicAddress true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/public_address [put]
func (p *publicAddress) Update(ctx *context.Context) {
	var req model.PublicAddress
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = p.svcPublicAddr.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update public address failed")
		return
	}

	ctx.Success(nil)
}

func (p *publicAddress) Route(h server.Handler) {
	g := h.Group("/system/public_address")
	g.GET("", p.Get)
	g.PUT("", p.Update)
}

func newPublicAddress(p *svc.PublicAddress) server.Router {
	return &publicAddress{svcPublicAddr: p}
}

func init() {
	registerAdminAPIRouter(newPublicAddress)
}
