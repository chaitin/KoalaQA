package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initKb struct{}

func (m *initKb) Version() int64 {
	return 20250922100919
}

func (m *initKb) Migrate(tx *gorm.DB) error {
	var count int64
	err := tx.Model(&model.KnowledgeBase{}).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	return tx.Create(&model.KnowledgeBase{
		Name: "默认知识库",
		Desc: "默认知识库",
	}).Error
}

func newInitKb() migrator.Migrator {
	return &initKb{}
}

func init() {
	registerDBMigrator(newInitKb)
}
