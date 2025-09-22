package cron

import (
	"github.com/chaitin/koalaqa/pkg/util"
	"go.uber.org/fx"
)

type Task interface {
	Period() string
	Run()
}

var modules []fx.Option

func Module() fx.Option {
	return fx.Options(
		fx.Provide(NewManager),
		fx.Options(modules...),
		fx.Invoke(func(manager *Manager) error {
			return manager.Start()
		}),
	)
}

func register(task any) {
	modules = append(modules, util.ProvideGroup("cron_tasks", task))
}
