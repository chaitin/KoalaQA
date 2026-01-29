package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type migSystemChatKey struct{}

func (m *migSystemChatKey) Version() int64 {
	return 20260129105502
}

func (m *migSystemChatKey) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.System[any]{}).Where("key = ?", "chat").
		UpdateColumn("key", model.SystemKeyChatDingtalk).Error
}

func newMigSystemChatKey() migrator.Migrator {
	return &migSystemChatKey{}
}

func init() {
	registerDBMigrator(newMigSystemChatKey)
}
