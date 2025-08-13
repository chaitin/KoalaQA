package model

import (
	"go.uber.org/fx"
)

func Module() fx.Option {
	return fx.Options(
		fx.Options(autoMigratorModules...),
	)
}

var autoMigratorModules []fx.Option

func registerAutoMigrate(m DBModel) {
	autoMigratorModules = append(autoMigratorModules,
		fx.Supply(fx.Annotate(
			m,
			fx.As(new(DBModel)),
			fx.ResultTags(`group:"auto_migrator_models"`),
		)),
	)
}
