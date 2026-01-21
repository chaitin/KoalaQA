package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initDocExportAt struct{}

func (m *initDocExportAt) Version() int64 {
	return 20260121111823
}

func (m *initDocExportAt) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.KBDocument{}).Where("true").UpdateColumn("export_at", gorm.Expr("updated_at")).Error
}

func newInitDocExportAt() migrator.Migrator {
	return &initDocExportAt{}
}

func init() {
	registerDBMigrator(newInitDocExportAt)
}
