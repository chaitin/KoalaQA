package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type setDefaultOrgName struct{}

func (m *setDefaultOrgName) Version() int64 {
	return 20251119193033
}

func (m *setDefaultOrgName) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Org{}).Where("builtin = ?", true).UpdateColumn("name", "默认组织").Error
}

func newSetDefaultOrgName() migrator.Migrator {
	return &setDefaultOrgName{}
}

func init() {
	registerDBMigrator(newSetDefaultOrgName)
}
