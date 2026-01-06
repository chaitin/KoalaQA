package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixDocRootParentId struct{}

func (m *fixDocRootParentId) Version() int64 {
	return 20260106174824
}

func (m *fixDocRootParentId) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.KBDocument{}).Where("parent_id != ?", 0).
		UpdateColumn("root_parent_id", gorm.Expr("parent_id")).Error
}

func newFixDocRootParentId() migrator.Migrator {
	return &fixDocRootParentId{}
}

func init() {
	registerDBMigrator(newFixDocRootParentId)
}
