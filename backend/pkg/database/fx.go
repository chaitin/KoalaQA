package database

import "go.uber.org/fx"

var Moudle = fx.Options(
	fx.Provide(NewDB),
)
