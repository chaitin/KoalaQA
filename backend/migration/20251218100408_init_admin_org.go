package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initAdminOrg struct{}

func (m *initAdminOrg) Version() int64 {
	return 20251218100408
}

func (m *initAdminOrg) Migrate(tx *gorm.DB) error {
	err := tx.Model(&model.Org{}).Where("builtin = ?", true).UpdateColumn("type", model.OrgTypeDefault).Error
	if err != nil {
		return err
	}

	var forumIDs []int64
	err = tx.Model(&model.Forum{}).Select("id").Where("true").Scan(&forumIDs).Error
	if err != nil {
		return err
	}

	adminOrg := model.Org{
		Builtin:  true,
		Name:     "访问全部板块",
		ForumIDs: model.Int64Array(forumIDs),
		Type:     model.OrgTypeAdmin,
	}
	err = tx.Create(&adminOrg).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.User{}).Where("role = ? AND builtin = ?", model.UserRoleAdmin, true).
		UpdateColumn("org_ids", gorm.Expr("ARRAY_APPEND(org_ids, ?)", adminOrg.ID)).Error
	if err != nil {
		return err
	}

	return nil
}

func newInitAdminOrg() migrator.Migrator {
	return &initAdminOrg{}
}

func init() {
	registerDBMigrator(newInitAdminOrg)
}
