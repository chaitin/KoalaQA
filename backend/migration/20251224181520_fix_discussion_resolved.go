package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixDiscussionResolved struct{}

func (m *fixDiscussionResolved) Version() int64 {
	return 20251224181520
}

func (m *fixDiscussionResolved) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Discussion{}).Where("resolved = ?", model.DiscussionStateUnknown).
		Updates(map[string]any{
			"resolved":   model.DiscussionStateNone,
			"updated_at": gorm.Expr("updated_at"),
		}).Error
}

func newFixDiscussionResolved() migrator.Migrator {
	return &fixDiscussionResolved{}
}

func init() {
	registerDBMigrator(newFixDiscussionResolved)
}
