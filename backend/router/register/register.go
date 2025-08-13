package register

import (
	"github.com/chaitin/koalaqa/pkg/util"
	"go.uber.org/fx"
)

var modules []fx.Option

func Module() fx.Option {
	return fx.Options(modules...)
}

func GlobalRouter(r any) {
	registerRouter("global_routers", r)
}

func ApiRouter(r any) {
	registerRouter("api_routers", r)
}

func ApiAuthRouter(r any) {
	registerRouter("api_auth_routers", r)
}

func AdminAPIRouter(r any) {
	registerRouter("admin_api_routers", r)
}

func registerRouter(group string, r interface{}) {
	modules = append(modules, util.ProvideGroup(group, r))
}
