package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type auth struct {
	svcAuth *svc.Auth
}

// Get
// @Summary login_method detail
// @Tags login_method
// @Produce json
// @Success 200 {object} context.Response{data=model.Auth}
// @Router /admin/system/login_method [get]
func (l *auth) Get(ctx *context.Context) {
	cfg, err := l.svcAuth.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get login method failed")
		return
	}

	ctx.Success(cfg)
}

// Put
// @Summary update login_method config
// @Tags login_method
// @Accept json
// @Param req body model.Auth true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/login_method [put]
func (l *auth) Put(ctx *context.Context) {
	var req model.Auth
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = l.svcAuth.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update login method failed")
		return
	}

	ctx.Success(nil)
}

func (l *auth) Route(h server.Handler) {
	g := h.Group("/system/login_method")
	g.GET("", l.Get)
	g.PUT("", l.Put)
}

func newAuth(l *svc.Auth) server.Router {
	return &auth{svcAuth: l}
}

func init() {
	registerAdminAPIRouter(newAuth)
}
