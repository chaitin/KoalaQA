package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type builtinAdminOrg struct{}

func (m *builtinAdminOrg) Version() int64 {
	return 20251218173310
}

func (m *builtinAdminOrg) Migrate(tx *gorm.DB) error {
	var adminOrg model.Org
	err := tx.Model(&model.Org{}).Where("builtin = ? AND type = ?", true, model.OrgTypeAdmin).First(&adminOrg).Error
	if err != nil {
		return err
	}

	return tx.Model(&model.User{}).Where("builtin = ? AND role = ?", true, model.UserRoleAdmin).
		UpdateColumn("org_ids", model.Int64Array{int64(adminOrg.ID)}).Error
}

func newBuiltinAdminOrg() migrator.Migrator {
	return &builtinAdminOrg{}
}

func init() {
	registerDBMigrator(newBuiltinAdminOrg)
}
