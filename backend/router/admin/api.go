package admin

import (
	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/server"
	"go.uber.org/fx"
)

type api struct {
	in adminAPIIn
}

type adminAPIIn struct {
	fx.In

	Interceptors []intercept.Interceptor `group:"admin_api_interceptors"`
	Routers      []server.Router         `group:"admin_api_routers"`
}

func (a *api) Route(h server.Handler) {
	group := h.GroupInterceptors("/admin", a.in.Interceptors...)

	for _, router := range a.in.Routers {
		router.Route(group)
	}
}

func newAPI(in adminAPIIn) server.Router {
	return &api{in: in}
}

func init() {
	registerApiAuthRouter(newAPI)
}
