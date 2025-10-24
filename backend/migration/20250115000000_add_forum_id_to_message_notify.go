package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type addForumIDToMessageNotify struct {
}

func (m *addForumIDToMessageNotify) Version() int64 {
	return 20250115000000
}

func (m *addForumIDToMessageNotify) Migrate(tx *gorm.DB) error {
	// 检查forum_id字段是否已存在
	if tx.Migrator().HasColumn(&model.MessageNotify{}, "forum_id") {
		return nil
	}

	// 添加forum_id字段
	if err := tx.Migrator().AddColumn(&model.MessageNotify{}, "forum_id"); err != nil {
		return err
	}

	// 为现有的message_notify记录设置forum_id
	// 通过discussion_id关联获取forum_id
	if err := tx.Exec(`
		UPDATE message_notifies 
		SET forum_id = d.forum_id 
		FROM discussions d 
		WHERE message_notifies.discussion_id = d.id 
		AND message_notifies.forum_id IS NULL
	`).Error; err != nil {
		return err
	}

	// 为无法关联到discussion的记录设置默认forum_id
	var defaultForumID uint
	if err := tx.Model(&model.Forum{}).Select("id").First(&defaultForumID).Error; err != nil {
		// 如果没有forum记录，创建一个默认的
		defaultForum := model.Forum{
			Name: "默认板块",
		}
		if err := tx.Create(&defaultForum).Error; err != nil {
			return err
		}
		defaultForumID = defaultForum.ID
	}

	// 更新剩余的NULL值
	if err := tx.Model(&model.MessageNotify{}).
		Where("forum_id IS NULL").
		Update("forum_id", defaultForumID).Error; err != nil {
		return err
	}

	return nil
}

func newAddForumIDToMessageNotify() migrator.Migrator {
	return &addForumIDToMessageNotify{}
}

func init() {
	registerDBMigrator(newAddForumIDToMessageNotify)
}
