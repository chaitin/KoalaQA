package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type updateUserPoint struct{}

func (m *updateUserPoint) Version() int64 {
	return 20251205095902
}

func (m *updateUserPoint) Migrate(tx *gorm.DB) error {
	err := tx.Exec(`DROP INDEX IF EXISTS idx_user_point_record_user_type`).Error
	if err != nil {
		return err
	}

	return nil
}

func newUpdateUserPoint() migrator.Migrator {
	return &updateUserPoint{}
}

func init() {
	registerDBMigrator(newUpdateUserPoint)
}
