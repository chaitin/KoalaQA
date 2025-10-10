package server

import (
	"context"

	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/report"
	"github.com/chaitin/koalaqa/pkg/version"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(New),
	fx.Invoke(func(lc fx.Lifecycle, e *Engine, v *version.Info, cfg config.Config) {
		e.Init()

		lc.Append(fx.Hook{
			OnStart: func(ctx context.Context) error {
				v.Print()

				r := report.NewReport(v, cfg)
				go r.ReportInstallation()

				go e.Run()
				return nil
			},
			OnStop: func(ctx context.Context) error {
				return nil
			},
		})
	}),
)
