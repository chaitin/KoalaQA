package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initOrg struct{}

func (m *initOrg) Version() int64 {
	return 20251031102809
}

func (m *initOrg) Migrate(tx *gorm.DB) error {
	var forumIDs []int64
	err := tx.Model(&model.Forum{}).Select("id").Where("true").Scan(&forumIDs).Error
	if err != nil {
		return err
	}
	org := model.Org{
		Builtin:  true,
		Name:     "默认组织",
		ForumIDs: model.Int64Array(forumIDs),
	}
	err = tx.Create(&org).Error
	if err != nil {
		return err
	}

	return tx.Model(&model.User{}).Where("true").UpdateColumn("org_ids", model.Int64Array{int64(org.ID)}).Error
}

func newInitOrg() migrator.Migrator {
	return &initOrg{}
}

func init() {
	registerDBMigrator(newInitOrg)
}
