package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixCommentLikeCnt struct{}

func (m *fixCommentLikeCnt) Version() int64 {
	return 20260104095841
}

func (m *fixCommentLikeCnt) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Comment{}).Where(`"like" < 0 OR dislike < 0`).Updates(map[string]any{
		"like":       gorm.Expr(`GREATEST("like", 0)`),
		"dislike":    gorm.Expr(`GREATEST(dislike, 0)`),
		"updated_at": gorm.Expr("updated_at"),
	}).Error
}

func newFixCommentLikeCnt() migrator.Migrator {
	return &fixCommentLikeCnt{}
}

func init() {
	registerDBMigrator(newFixCommentLikeCnt)
}
