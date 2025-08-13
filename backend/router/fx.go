package router

import (
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/router/admin"
	"go.uber.org/fx"
)

var modules []fx.Option

func Module() fx.Option {
	return fx.Options(
		admin.Module(),
		fx.Options(modules...),
	)
}

func registerGlobalRouter(r any) {
	registerRouter("global_routers", r)
}

func registerApiRouter(r any) {
	registerRouter("api_routers", r)
}

func registerApiAuthRouter(r any) {
	registerRouter("api_auth_routers", r)
}

func registerApiNoAuthRouter(r any) {
	registerRouter("api_no_auth_routers", r)
}

func registerRouter(group string, r any) {
	modules = append(modules, util.ProvideGroup(group, r))
}
