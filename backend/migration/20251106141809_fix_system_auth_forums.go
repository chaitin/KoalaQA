package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixSystemAuthForums struct{}

func (m *fixSystemAuthForums) Version() int64 {
	return 20251106141809
}

func (m *fixSystemAuthForums) Migrate(tx *gorm.DB) error {
	var (
		forum model.Forum
		auth  model.System[model.Auth]
	)

	err := tx.Model(&forum).Order("index ASC").Scan(&forum).Error
	if err != nil {
		return err
	}

	err = tx.Model(&auth).Where("key = ?", model.SystemKeyAuth).First(&auth).Error
	if err != nil {
		return err
	}

	inner := auth.Value.Inner()
	inner.PublicForumIDs = []uint{forum.ID}

	return tx.Model(&auth).Where("key = ?", model.SystemKeyAuth).
		Update("value", model.NewJSONBAny(inner)).Error
}

func newFixSystemAuthForums() migrator.Migrator {
	return &fixSystemAuthForums{}
}

func init() {
	registerDBMigrator(newFixSystemAuthForums)
}
