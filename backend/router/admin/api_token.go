package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type apiToken struct {
	apiToken *svc.APIToken
}

func (a *apiToken) Route(h server.Handler) {
	g := h.Group("/token")
	g.GET("", a.List)
	g.POST("", a.Create)

	{
		detailG := g.Group("/:token_id")
		detailG.DELETE("", a.Delete)
	}
}

func newAPIToken(token *svc.APIToken) server.Router {
	return &apiToken{
		apiToken: token,
	}
}

// List
// @Summary backend list api token
// @Description backend list api token
// @Tags api_token
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.APIToken}}
// @Router /admin/token [get]
func (a *apiToken) List(ctx *context.Context) {
	res, err := a.apiToken.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list token failed")
		return
	}

	ctx.Success(res)
}

// Create
// @Summary create api token
// @Tags api_token
// @Accept json
// @Param req body svc.APITokenCreateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/token [post]
func (a *apiToken) Create(ctx *context.Context) {
	var req svc.APITokenCreateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := a.apiToken.Create(ctx, req)
	if err != nil {
		ctx.InternalError(err, "create token failed")
		return
	}

	ctx.Success(res)
}

// Delete
// @Summary delete api token
// @Tags api_token
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/token/{token_id} [delete]
func (a *apiToken) Delete(ctx *context.Context) {
	id, err := ctx.ParamUint("token_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = a.apiToken.Delete(ctx, id)
	if err != nil {
		ctx.InternalError(err, "delete token failed")
		return
	}

	ctx.Success(nil)
}

func init() {
	registerAdminAPIRouter(newAPIToken)
}
