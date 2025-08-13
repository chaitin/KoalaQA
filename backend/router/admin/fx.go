package admin

import (
	"github.com/chaitin/koalaqa/pkg/util"
	"go.uber.org/fx"
)

var modules []fx.Option

func Module() fx.Option {
	return fx.Options(modules...)
}

func registerAdminAPIRouter(r any) {
	registerRouter("admin_api_routers", r)
}

func registerApiAuthRouter(r any) {
	registerRouter("api_auth_routers", r)
}

func registerRouter(group string, r any) {
	modules = append(modules, util.ProvideGroup(group, r))
}
