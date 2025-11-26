package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type deleteRanksUdx struct{}

func (m *deleteRanksUdx) Version() int64 {
	return 20251126115441
}

func (m *deleteRanksUdx) Migrate(tx *gorm.DB) error {
	return tx.Exec(`DROP INDEX IF EXISTS udx_rank_type_id`).Error
}

func newDeleteRanksUdx() migrator.Migrator {
	return &deleteRanksUdx{}
}

func init() {
	registerDBMigrator(newDeleteRanksUdx)
}
