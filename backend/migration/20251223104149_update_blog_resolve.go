package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type updateBlogResolve struct{}

func (m *updateBlogResolve) Version() int64 {
	return 20251223104149
}

func (m *updateBlogResolve) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Discussion{}).Where("type = ? AND (resolved IS NULL OR resolved = ?)", model.DiscussionTypeBlog, model.DiscussionStateClosed).
		Updates(map[string]any{
			"resolved":    model.DiscussionStateNone,
			"resolved_at": gorm.Expr("NULL"),
			"updated_at":  gorm.Expr("updated_at"),
		}).Error
}

func newUpdateBlogResolve() migrator.Migrator {
	return &updateBlogResolve{}
}

func init() {
	registerDBMigrator(newUpdateBlogResolve)
}
