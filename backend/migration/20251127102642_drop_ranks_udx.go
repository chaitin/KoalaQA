package migration

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/rag"
)

type dropRanksUdx struct {
	rag rag.Service
}

func (m *dropRanksUdx) Version() int64 {
	return 20251127102642
}

func (m *dropRanksUdx) Migrate(tx *gorm.DB) error {
	err := tx.Exec(`DROP INDEX IF EXISTS udx_rank_type_id_foreign_id`).Error
	if err != nil {
		return nil
	}

	var forums []model.Forum
	err = tx.Model(&model.Forum{}).Find(&forums).Error
	if err != nil {
		return err
	}

	var insights []model.Rank
	err = tx.Model(&model.Rank{}).Where("type = ?", model.RankTypeAIInsight).
		Where("foreign_id = ?", 0).
		Find(&insights).Error
	if err != nil {
		return err
	}
	if len(insights) == 0 {
		return nil
	}

	ragIDs := make([]string, len(insights))
	for i := range insights {
		ragIDs[i] = insights[i].RagID
	}

	for _, forum := range forums {
		err = m.rag.DeleteRecords(context.Background(), forum.InsightDatasetID, ragIDs)
		if err != nil {
			return err
		}
	}

	return tx.Model(&model.Rank{}).Where("type = ?", model.RankTypeAIInsight).
		Where("foreign_id = ?", 0).
		UpdateColumn("rag_id", "").Error
}

func newDropRanksUdx(r rag.Service) migrator.Migrator {
	return &dropRanksUdx{rag: r}
}

func init() {
	registerDBMigrator(newDropRanksUdx)
}
