package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initForum struct {
}

func (m *initForum) Version() int64 {
	return 20251022141253
}

func (m *initForum) Migrate(tx *gorm.DB) error {
	var count int64
	if err := tx.Model(&model.Forum{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	forum := model.Forum{
		Name: "默认板块",
	}
	if err := tx.Create(&forum).Error; err != nil {
		return err
	}
	if err := tx.Model(&model.Group{}).Where("forum_id = 0").Update("forum_id", forum.ID).Error; err != nil {
		return err
	}
	return nil
}

func newInitForum() migrator.Migrator {
	return &initForum{}
}

func init() {
	registerDBMigrator(newInitForum)
}
