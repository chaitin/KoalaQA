package migration

import (
	"time"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
)

type aiInsight struct{}

func (m *aiInsight) Version() int64 {
	return 20251215114550
}

func (m *aiInsight) Migrate(tx *gorm.DB) error {
	var aiInsightRanks []model.Rank
	now := time.Now()
	err := tx.Model(&model.Rank{}).
		Where("type = ?", model.RankTypeAIInsight).
		Where("created_at >= ?", util.WeekTrunc(now)).
		Order("created_at ASC").
		Find(&aiInsightRanks).Error
	if err != nil {
		return err
	}
	if len(aiInsightRanks) == 0 {
		return nil
	}

	var aiInsights []model.AIInsight
	for _, aiInsightRank := range aiInsightRanks {
		aiInsights = append(aiInsights, model.AIInsight{
			Base: model.Base{
				CreatedAt: aiInsightRank.CreatedAt,
				UpdatedAt: aiInsightRank.UpdatedAt,
			},
			ForumID: aiInsightRank.ForeignID,
			Keyword: aiInsightRank.ScoreID,
		})
	}

	err = tx.CreateInBatches(&aiInsights, 1000).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.Rank{}).
		Where("type = ?", model.RankTypeAIInsight).
		Where("created_at >= ?", util.WeekTrunc(now)).
		Delete(nil).Error
	if err != nil {
		return err
	}

	return nil
}

func newAiInsight() migrator.Migrator {
	return &aiInsight{}
}

func init() {
	registerDBMigrator(newAiInsight)
}
