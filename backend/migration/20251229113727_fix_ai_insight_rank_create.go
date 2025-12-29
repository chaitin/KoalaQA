package migration

import (
	"time"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixAiInsightRankCreate struct{}

func (m *fixAiInsightRankCreate) Version() int64 {
	return 20251229113727
}

func (m *fixAiInsightRankCreate) Migrate(tx *gorm.DB) error {
	t, err := time.Parse(time.DateOnly, "2025-12-20")
	if err != nil {
		return err
	}
	return tx.Model(&model.Rank{}).Where("type = ? AND created_at > ?", model.RankTypeAIInsight, t).
		Updates(map[string]any{
			"created_at": gorm.Expr(`created_at - INTERVAL '7 days'`),
			"updated_at": gorm.Expr(`updated_at - INTERVAL '7 days'`),
		}).Error
}

func newFixAiInsightRankCreate() migrator.Migrator {
	return &fixAiInsightRankCreate{}
}

func init() {
	registerDBMigrator(newFixAiInsightRankCreate)
}
