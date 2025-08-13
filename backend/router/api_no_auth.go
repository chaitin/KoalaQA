package router

import (
	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/server"
	"go.uber.org/fx"
)

type apiNoAuth struct {
	in apiNoAuthIn
}

type apiNoAuthIn struct {
	fx.In

	Routers      []server.Router         `group:"api_no_auth_routers"`
	Interceptors []intercept.Interceptor `group:"api_no_auth_interceptors"`
}

func (a *apiNoAuth) Route(e server.Handler) {
	group := e.GroupInterceptors("/api", a.in.Interceptors...)
	for _, router := range a.in.Routers {
		router.Route(group)
	}
}

func newApiNoAuth(in apiNoAuthIn) server.Router {
	return &apiNoAuth{in: in}
}

func init() {
	registerGlobalRouter(newApiNoAuth)
}
