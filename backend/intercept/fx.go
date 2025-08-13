package intercept

import (
	"github.com/chaitin/koalaqa/pkg/util"
	"go.uber.org/fx"
)

var modules []fx.Option

func registerGlobal(i any) {
	register("global_interceptors", i)
}

func registerAPIAuth(i any) {
	register("api_auth_interceptors", i)
}

func registerAPINoAuth(i any) {
	register("api_no_auth_interceptors", i)
}

func registerAdminAPI(i any) {
	register("admin_api_interceptors", i)
}

func register(group string, i any) {
	modules = append(modules, util.ProvideGroup(group, i))
}

func Module() fx.Option {
	return fx.Options(modules...)
}
