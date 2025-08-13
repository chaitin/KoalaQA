package server

import (
	"context"

	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(New),
	fx.Invoke(func(lc fx.Lifecycle, r *Engine) {
		r.Init()

		lc.Append(fx.Hook{
			OnStart: func(ctx context.Context) error {
				go r.Run()
				return nil
			},
			OnStop: func(ctx context.Context) error {
				return nil
			},
		})
	}),
)
