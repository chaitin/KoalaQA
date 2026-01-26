package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type migAuthEnableRegister struct{}

func (m *migAuthEnableRegister) Version() int64 {
	return 20260126102034
}

func (m *migAuthEnableRegister) Migrate(tx *gorm.DB) error {
	var sysAuth model.System[model.Auth]
	err := tx.Model(&model.System[model.Auth]{}).Where("key = ?", model.SystemKeyAuth).First(&sysAuth).Error
	if err != nil {
		return err
	}

	inner := sysAuth.Value.Inner()

	for i, info := range inner.AuthInfos {
		switch info.Type {
		case model.AuthTypePassword, model.AuthTypeWechat:
			inner.AuthInfos[i].EnableRegister = inner.EnableRegister
		default:
			inner.AuthInfos[i].EnableRegister = true
		}
	}

	return tx.Model(&model.System[model.Auth]{}).
		Where("key = ?", model.SystemKeyAuth).UpdateColumn("value", model.NewJSONB(inner)).Error
}

func newMigAuthEnableRegister() migrator.Migrator {
	return &migAuthEnableRegister{}
}

func init() {
	registerDBMigrator(newMigAuthEnableRegister)
}
