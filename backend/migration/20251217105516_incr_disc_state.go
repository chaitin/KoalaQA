package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type incrDiscState struct{}

func (m *incrDiscState) Version() int64 {
	return 20251217105516
}

func (m *incrDiscState) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Discussion{}).Where("true").UpdateColumn("resolved", gorm.Expr("resolved+1")).Error
}

func newIncrDiscState() migrator.Migrator {
	return &incrDiscState{}
}

func init() {
	registerDBMigrator(newIncrDiscState)
}
