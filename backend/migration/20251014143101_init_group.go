package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initGroup struct{}

func (m *initGroup) Version() int64 {
	return 20251014143101
}

func (m *initGroup) Migrate(tx *gorm.DB) error {
	var count int64
	err := tx.Model(&model.Group{}).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	g := &model.Group{
		Name:  "产品名称",
		Index: 0,
	}
	if err := tx.Create(g).Error; err != nil {
		return err
	}
	items := []model.GroupItem{
		{
			GroupID: g.ID,
			Index:   0,
			Name:    "产品一",
		},
		{
			GroupID: g.ID,
			Index:   1,
			Name:    "产品二",
		},
		{
			GroupID: g.ID,
			Index:   2,
			Name:    "产品三",
		},
	}
	if err := tx.CreateInBatches(items, 1000).Error; err != nil {
		return err
	}
	return nil
}

func newInitGroup() migrator.Migrator {
	return &initGroup{}
}

func init() {
	registerDBMigrator(newInitGroup)
}
