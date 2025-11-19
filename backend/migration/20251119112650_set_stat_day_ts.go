package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type setStatDayTs struct{}

func (m *setStatDayTs) Version() int64 {
	return 20251119112650
}

func (m *setStatDayTs) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Stat{}).Where("true").Update("day_ts", gorm.Expr("ts")).Error
}

func newSetStatDayTs() migrator.Migrator {
	return &setStatDayTs{}
}

func init() {
	registerDBMigrator(newSetStatDayTs)
}
