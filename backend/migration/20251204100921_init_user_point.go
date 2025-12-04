package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initUserPoint struct{}

func (m *initUserPoint) Version() int64 {
	return 20251204100921
}

func (m *initUserPoint) Migrate(tx *gorm.DB) error {
	err := tx.Model(&model.User{}).Where("true").
		UpdateColumn("point", gorm.Expr("CASE WHEN role = ? THEN 0 ELSE 1 END + CASE WHEN avatar != '' THEN 5 ELSE 0 END + CASE WHEN intro != '' THEN 5 ELSE 0 END", model.UserRoleGuest)).Error
	if err != nil {
		return err
	}

	var allUsers []model.User
	err = tx.Model(&model.User{}).Where("true").Order("id ASC").Find(&allUsers).Error
	if err != nil {
		return err
	}

	records := make([]model.UserPointRecord, 0)
	for _, user := range allUsers {
		if user.Role != model.UserRoleGuest {
			records = append(records, model.UserPointRecord{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID: user.ID,
					Type:   model.UserPointTypeUserRole,
				},
				Point: 1,
			})
		}

		if user.Avatar != "" {
			records = append(records, model.UserPointRecord{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID: user.ID,
					Type:   model.UserPointTypeUserAvatar,
				},
				Point: 5,
			})
		}

		if user.Intro != "" {
			records = append(records, model.UserPointRecord{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID: user.ID,
					Type:   model.UserPointTypeUserIntro,
				},
				Point: 5,
			})
		}
	}

	return tx.CreateInBatches(&records, 1000).Error
}

func newInitUserPoint() migrator.Migrator {
	return &initUserPoint{}
}

func init() {
	registerDBMigrator(newInitUserPoint)
}
