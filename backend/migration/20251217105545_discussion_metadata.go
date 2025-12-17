package migration

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/repo"
)

type discussionMetadata struct {
	repoDisc *repo.Discussion
	rag      rag.Service
}

func (m *discussionMetadata) Version() int64 {
	return 20251217105545
}

func (m *discussionMetadata) Migrate(tx *gorm.DB) error {
	var forums []model.Forum
	err := tx.Model(&model.Forum{}).Where("true").Find(&forums).Error
	if err != nil {
		return err
	}

	forumDatasetID := make(map[uint]string)
	for _, forum := range forums {
		forumDatasetID[forum.ID] = forum.DatasetID
	}

	err = m.repoDisc.BatchProcess(context.Background(), 200, func(d []*model.Discussion) error {
		for _, disc := range d {
			datasetID, ok := forumDatasetID[disc.ForumID]
			if !ok {
				continue
			}

			err := m.rag.UpdateDocumentMetadata(context.TODO(), datasetID, disc.RagID, rag.Metadata{
				DiscMetadata: disc.Metadata(),
			})
			if err != nil {
				continue
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func newDiscussionMetadata(disc *repo.Discussion, rag rag.Service) migrator.Migrator {
	return &discussionMetadata{repoDisc: disc, rag: rag}
}

func init() {
	registerDBMigrator(newDiscussionMetadata)
}
