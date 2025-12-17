package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initQaLastVisited struct{}

func (m *initQaLastVisited) Version() int64 {
	return 20251217164414
}

func (m *initQaLastVisited) Migrate(tx *gorm.DB) error {
	err := tx.Model(&model.Discussion{}).
		Where("type = ? AND (bot_unknown = ? OR bot_unknown IS NULL)", model.DiscussionTypeQA, false).
		UpdateColumn("last_visited", gorm.Expr("created_at")).Error
	if err != nil {
		return err
	}

	err = tx.Exec(`UPDATE discussions SET last_visited = tmp_comment.created_at
FROM (
	SELECT discussion_id, MIN(created_at) AS created_at 
	FROM comments WHERE bot = false
	GROUP BY discussion_id
) AS tmp_comment
WHERE tmp_comment.discussion_id = discussions.id AND discussions.bot_unknown = true AND discussions.type = ?`, model.DiscussionTypeQA).Error
	if err != nil {
		return err
	}

	return nil
}

func newInitQaLastVisited() migrator.Migrator {
	return &initQaLastVisited{}
}

func init() {
	registerDBMigrator(newInitQaLastVisited)
}
