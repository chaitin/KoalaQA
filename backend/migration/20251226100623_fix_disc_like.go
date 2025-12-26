package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixDiscLike struct{}

func (m *fixDiscLike) Version() int64 {
	return 20251226100623
}

func (m *fixDiscLike) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Discussion{}).Where(`"like" < 0`).UpdateColumn(`"like"`, 0).Error
}

func newFixDiscLike() migrator.Migrator {
	return &fixDiscLike{}
}

func init() {
	registerDBMigrator(newFixDiscLike)
}
