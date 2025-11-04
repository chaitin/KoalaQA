package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type fixNotifyToName struct{}

func (m *fixNotifyToName) Version() int64 {
	return 20251104182916
}

func (m *fixNotifyToName) Migrate(tx *gorm.DB) error {
	return tx.Exec(`UPDATE message_notifies SET to_name = u.name 
FROM (SELECT id, name FROM users) AS u
WHERE message_notifies.to_id = u.id`).Error
}

func newFixNotifyToName() migrator.Migrator {
	return &fixNotifyToName{}
}

func init() {
	registerDBMigrator(newFixNotifyToName)
}
