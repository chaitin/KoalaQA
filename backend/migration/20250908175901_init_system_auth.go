package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initSystemAuth struct{}

func (m *initSystemAuth) Version() int64 {
	return 20250908175901
}

func (m *initSystemAuth) Migrate(tx *gorm.DB) error {
	return tx.Create(&model.System[model.Auth]{
		Key: model.SystemKeyAuth,
		Value: model.NewJSONB(model.Auth{
			EnableRegister: true,
			PublicAccess:   true,
			AuthInfos: []model.AuthInfo{
				{
					Type: model.AuthTypePassword,
				},
			},
		}),
	}).Error
}

func newInitSystemAuth() migrator.Migrator {
	return &initSystemAuth{}
}

func init() {
	registerDBMigrator(newInitSystemAuth)
}
