package migration

import (
	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type alwaysMigrator struct {
	models []model.DBModel `group:"auth_migrator_models"`
}

func (a *alwaysMigrator) Version() int64 {
	return 0
}

func (a *alwaysMigrator) Migrate(tx *gorm.DB) error {
	for _, model := range a.models {
		err := tx.AutoMigrate(model)
		if err != nil {
			return err
		}
	}
	return nil
}

type in struct {
	fx.In

	Models []model.DBModel `group:"auto_migrator_models"`
}

func newAlwaysMigrator(i in) migrator.Migrator {
	return &alwaysMigrator{models: i.Models}
}
