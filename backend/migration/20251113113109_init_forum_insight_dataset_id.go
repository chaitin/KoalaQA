package migration

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/rag"
)

type initForumInsightDatasetId struct {
	rag rag.Service
}

func (m *initForumInsightDatasetId) Version() int64 {
	return 20251113113109
}

func (m *initForumInsightDatasetId) Migrate(tx *gorm.DB) error {
	var forums []model.Forum
	err := tx.Model(&model.Forum{}).Where("true").Find(&forums).Error
	if err != nil {
		return err
	}

	for _, forum := range forums {
		if forum.InsightDatasetID != "" {
			continue
		}

		datasetID, err := m.rag.CreateDataset(context.Background())
		if err != nil {
			return err
		}

		err = tx.Model(&model.Forum{}).Where("id = ?", forum.ID).UpdateColumn("insight_dataset_id", datasetID).Error
		if err != nil {
			return err
		}
	}

	return nil
}

func newInitForumInsightDatasetId(r rag.Service) migrator.Migrator {
	return &initForumInsightDatasetId{rag: r}
}

func init() {
	registerDBMigrator(newInitForumInsightDatasetId)
}
