package router

import (
	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/server"
	"go.uber.org/fx"
)

type apiAuth struct {
	in apiAuthIn
}

type apiAuthIn struct {
	fx.In

	Routers      []server.Router         `group:"api_auth_routers"`
	Interceptors []intercept.Interceptor `group:"api_auth_interceptors"`
}

func (a *apiAuth) Route(e server.Handler) {
	group := e.GroupInterceptors("/api", a.in.Interceptors...)
	for _, router := range a.in.Routers {
		router.Route(group)
	}
}

func newApiAuth(in apiAuthIn) server.Router {
	return &apiAuth{in: in}
}

func init() {
	registerGlobalRouter(newApiAuth)
}
