package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type fixUserOrg struct{}

func (m *fixUserOrg) Version() int64 {
	return 20251103150532
}

func (m *fixUserOrg) Migrate(tx *gorm.DB) error {
	var org model.Org
	err := tx.Model(&model.Org{}).Where("builtin = ?", true).First(&org).Error
	if err != nil {
		return err
	}

	return tx.Model(&model.User{}).Where("array_length(org_ids, 1) = ?", 0).Update("org_ids", model.Int64Array{int64(org.ID)}).Error
}

func newFixUserOrg() migrator.Migrator {
	return &fixUserOrg{}
}

func init() {
	registerDBMigrator(newFixUserOrg)
}
