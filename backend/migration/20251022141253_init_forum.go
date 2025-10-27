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
	var gids []int64
	if err := tx.Model(&model.Group{}).Pluck("id", &gids).Error; err != nil {
		return err
	}
	var dataset model.Dataset
	if err := tx.Model(&model.Dataset{}).Where("name = ?", model.DatasetFrontend).First(&dataset).Error; err != nil {
		return err
	}
	forum := model.Forum{
		Name:      "默认板块",
		DatasetID: dataset.SetID,
		GroupIDs:  gids,
		RouteName: "default",
	}
	if err := tx.Create(&forum).Error; err != nil {
		return err
	}
	if err := tx.Model(&model.Discussion{}).Where("forum_id = 0 or forum_id is null").Update("forum_id", forum.ID).Error; err != nil {
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
