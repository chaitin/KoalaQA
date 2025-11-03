package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initForumGroups struct{}

func (m *initForumGroups) Version() int64 {
	return 20251103113430
}

func (m *initForumGroups) Migrate(tx *gorm.DB) error {
	return tx.Model(&model.Forum{}).Where("true").Updates(map[string]any{
		"groups": gorm.Expr("jsonb_build_array(jsonb_build_object('type','qa','group_ids',group_ids), jsonb_build_object('type', 'feedback','group_ids',group_ids), jsonb_build_object('type', 'blog','group_ids',group_ids))"),
	}).Error
}

func newInitForumGroups() migrator.Migrator {
	return &initForumGroups{}
}

func init() {
	registerDBMigrator(newInitForumGroups)
}
