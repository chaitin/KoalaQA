package chat

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(newStateManager),
)
