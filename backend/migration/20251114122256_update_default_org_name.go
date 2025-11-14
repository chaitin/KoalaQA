package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type updateDefaultOrgName struct{}

func (m *updateDefaultOrgName) Version() int64 {
	return 20251114122256
}

func (m *updateDefaultOrgName) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Org{}).Where("builtin = ?", true).UpdateColumn("name", "游客").Error
}

func newUpdateDefaultOrgName() migrator.Migrator {
	return &updateDefaultOrgName{}
}

func init() {
	registerDBMigrator(newUpdateDefaultOrgName)
}
