package cron

import (
	"github.com/robfig/cron/v3"
	"go.uber.org/fx"
)

type Manager struct {
	tasks []Task
	cron  *cron.Cron
}

type managerIn struct {
	fx.In

	Tasks []Task `group:"cron_tasks"`
}

func NewManager(in managerIn) *Manager {
	return &Manager{
		tasks: in.Tasks,
		cron: cron.New(cron.WithParser(cron.NewParser(cron.Second|cron.Minute|cron.Hour|
			cron.Dom|cron.Month|cron.DowOptional|cron.Descriptor)), cron.WithChain()),
	}
}

func (m *Manager) Start() error {
	for _, task := range m.tasks {
		_, err := m.cron.AddFunc(task.Period(), task.Run)
		if err != nil {
			return err
		}
	}
	m.cron.Start()
	return nil
}
