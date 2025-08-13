package oss

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(newMinio),
	fx.Invoke(func(client Client) {
		global = client
	}),
)
