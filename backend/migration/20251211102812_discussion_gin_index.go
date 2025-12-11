package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type discussionGinIndex struct{}

func (m *discussionGinIndex) Version() int64 {
	return 20251211102812
}

func (m *discussionGinIndex) Migrate(tx *gorm.DB) error {
	return tx.Exec("CREATE INDEX idx_discussion_tag_ids_gin ON discussions USING GIN (tag_ids);").Error
}

func newDiscussionGinIndex() migrator.Migrator {
	return &discussionGinIndex{}
}

func init() {
	registerDBMigrator(newDiscussionGinIndex)
}
