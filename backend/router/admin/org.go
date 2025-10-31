package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type org struct {
	svcOrg *svc.Org
}

// List
// @Summary list org
// @Tags org
// @Param req query svc.OrgListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.OrgListItem}}
// @Router /admin/org [get]
func (o *org) List(ctx *context.Context) {
	var req svc.OrgListReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := o.svcOrg.List(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list org failed")
		return
	}

	ctx.Success(res)
}

// Upsert
// @Summary upsert org
// @Tags org
// @Param req body svc.OrgUpsertReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/org [post]
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

// Delete
// @Summary delete org
// @Tags org
// @Param org_id path uint true "org id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/org/{org_id} [delete]
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
