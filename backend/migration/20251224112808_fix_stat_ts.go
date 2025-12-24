package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixStatTs struct{}

func (m *fixStatTs) Version() int64 {
	return 20251224112808
}

func (m *fixStatTs) Migrate(tx *gorm.DB) error {
	statType := []model.StatType{model.StatTypeBotUnknown, model.StatTypeBotAccept, model.StatTypeBotUnknownComment}
	var stats []model.Stat
	err := tx.Table("(?) AS stat", tx.Model(&model.Stat{}).
		Select("stats.type, EXTRACT(EPOCH FROM DATE_TRUNC('hour', discussions.created_at))::bigint AS ts, stats.key, EXTRACT(EPOCH FROM DATE_TRUNC('day', discussions.created_at))::bigint AS day_ts").
		Joins("JOIN discussions ON discussions.uuid = stats.key").
		Where("stats.type IN (?)", statType),
	).
		Select("type, ts, key, day_ts, count(*) AS count").
		Group("type, ts, key, day_ts").
		Order("ts ASC").
		Find(&stats).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.Stat{}).
		Where("stats.type IN (?)", statType).
		Delete(nil).Error
	if err != nil {
		return err
	}

	return tx.Model(&model.Stat{}).CreateInBatches(&stats, 1000).Error
}

func newFixStatTs() migrator.Migrator {
	return &fixStatTs{}
}

func init() {
	registerDBMigrator(newFixStatTs)
}
