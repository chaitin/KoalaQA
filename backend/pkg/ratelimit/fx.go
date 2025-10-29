package ratelimit

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(New),
)
