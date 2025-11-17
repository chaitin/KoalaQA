package router

import (
	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/server"
	"go.uber.org/fx"
)

type apiNotGuest struct {
	in apiNotGuestIn
}

type apiNotGuestIn struct {
	fx.In

	Routers      []server.Router         `group:"api_not_guest_routers"`
	Interceptors []intercept.Interceptor `group:"api_not_guest_interceptors"`
}

func (a *apiNotGuest) Route(e server.Handler) {
	group := e.GroupInterceptors("", a.in.Interceptors...)
	for _, router := range a.in.Routers {
		router.Route(group)
	}
}

func newApiNotGuest(in apiNotGuestIn) server.Router {
	return &apiNotGuest{in: in}
}

func init() {
	registerApiAuthRouter(newApiNotGuest)
}
