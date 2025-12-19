package migration

import (
	"time"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initOldVersion struct{}

func (m *initOldVersion) Version() int64 {
	return 20251219110148
}

func (m *initOldVersion) Migrate(tx *gorm.DB) error {
	var migration model.Migration
	err := tx.Model(&model.Migration{}).Order("created_at ASC").First(&migration).Error
	if err != nil {
		return err
	}

	if time.Now().After(migration.CreatedAt.Time().Add(time.Minute * 10)) {
		return tx.Create(&model.Version{
			Version: "v2.9.0",
		}).Error
	}

	return nil
}

func newInitOldVersion() migrator.Migrator {
	return &initOldVersion{}
}

func init() {
	registerDBMigrator(newInitOldVersion)
}
