package third_auth

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(newManager),
)
