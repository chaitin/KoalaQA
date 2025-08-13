package router

import (
	"github.com/chaitin/koalaqa/server"
	"go.uber.org/fx"
)

type api struct {
	routers []server.Router
}

type apiIn struct {
	fx.In

	Routers []server.Router `group:"api_routers"`
}

func (a *api) Route(e server.Handler) {
	group := e.Group("/api")
	for _, router := range a.routers {
		router.Route(group)
	}
}

func newApi(in apiIn) server.Router {
	return &api{routers: in.Routers}
}

func init() {
	registerGlobalRouter(newApi)
}
