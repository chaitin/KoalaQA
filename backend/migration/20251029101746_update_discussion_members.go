package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type updateDiscussionMembers struct{}

func (m *updateDiscussionMembers) Version() int64 {
	return 20251029101746
}

func (m *updateDiscussionMembers) Migrate(tx *gorm.DB) error {
	return tx.Exec(`UPDATE discussions SET members = ARRAY_REMOVE(ARRAY_APPEND(comm.user_ids, user_id), 0)
FROM (SELECT discussion_id, ARRAY_AGG(distinct user_id) AS user_ids FROM comments GROUP BY discussion_id) AS comm
WHERE discussions.id = comm.discussion_id;`).Error
}

func newUpdateDiscussionMembers() migrator.Migrator {
	return &updateDiscussionMembers{}
}

func init() {
	registerDBMigrator(newUpdateDiscussionMembers)
}
