package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type org struct {
	svcOrg *svc.Org
}

func (o *org) List(ctx *context.Context) {
	res, err := o.svcOrg.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list org failed")
		return
	}

	ctx.Success(res)
}

func (o *org) Upsert(ctx *context.Context) {
	var req svc.OrgUpsertReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := o.svcOrg.Upsert(ctx, req)
	if err != nil {
		ctx.InternalError(err, "upsert org failed")
		return
	}

	ctx.Success(res)
}

func (o *org) Delete(ctx *context.Context) {
	orgID, err := ctx.ParamUint("org_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = o.svcOrg.Delete(ctx, orgID)
	if err != nil {
		ctx.InternalError(err, "delete org failed")
		return
	}

	ctx.Success(nil)
}

func (o *org) Route(h server.Handler) {
	g := h.Group("/org")
	g.GET("", o.List)
	g.POST("", o.Upsert)
	{
		detailG := g.Group("/:org_id")
		detailG.DELETE("", o.Delete)
	}
}

func newOrg(o *svc.Org) server.Router {
	return &org{
		svcOrg: o,
	}
}

func init() {
	registerAdminAPIRouter(newOrg)
}
