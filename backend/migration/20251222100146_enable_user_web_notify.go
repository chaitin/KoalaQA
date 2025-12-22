package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type enableUserWebNotify struct{}

func (m *enableUserWebNotify) Version() int64 {
	return 20251222100146
}

func (m *enableUserWebNotify) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.User{}).Where("true").UpdateColumn("web_notify", true).Error
}

func newEnableUserWebNotify() migrator.Migrator {
	return &enableUserWebNotify{}
}

func init() {
	registerDBMigrator(newEnableUserWebNotify)
}
