package migration

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type discussionBotKnown struct {
	repoStat *repo.Stat
}

func (m *discussionBotKnown) Version() int64 {
	return 20251216101215
}

func (m *discussionBotKnown) Migrate(tx *gorm.DB) error {
	return m.repoStat.BatchProcess(context.Background(), 200, func(s []*model.Stat) error {
		discUUIDs := make(model.StringArray, len(s))
		for i := range s {
			discUUIDs[i] = s[i].Key
		}

		return tx.Model(&model.Discussion{}).Where("uuid =ANY(?)", discUUIDs).UpdateColumn("bot_unknown", true).Error
	})
}

func newDiscussionBotKnown(stat *repo.Stat) migrator.Migrator {
	return &discussionBotKnown{repoStat: stat}
}

func init() {
	registerDBMigrator(newDiscussionBotKnown)
}
