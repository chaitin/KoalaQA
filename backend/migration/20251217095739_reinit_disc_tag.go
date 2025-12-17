package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type reinitDiscTag struct{}

func (m *reinitDiscTag) Version() int64 {
	return 20251217095739
}

func (m *reinitDiscTag) Migrate(tx *gorm.DB) error {
	var discTags []struct {
		ForumID uint
		TagID   uint
		Name    string
		Count   int
	}

	err := tx.Table("(?) AS tmp_tag", tx.Model(&model.Discussion{}).Select("forum_id, unnest(tag_ids) AS tag_id")).
		Select("tmp_tag.forum_id, tmp_tag.tag_id, MAX(discussion_tags.name) AS name, count(*) AS count").
		Joins("LEFT JOIN discussion_tags ON discussion_tags.id = tmp_tag.tag_id").
		Group("tmp_tag.forum_id, tmp_tag.tag_id").
		Find(&discTags).Error
	if err != nil {
		return err
	}

	createTags := make([]model.DiscussionTag, len(discTags))
	for i, tag := range discTags {
		createTags[i] = model.DiscussionTag{
			Base: model.Base{
				ID: tag.TagID,
			},
			ForumID: tag.ForumID,
			Name:    tag.Name,
			Count:   tag.Count,
		}
	}

	err = tx.Model(&model.DiscussionTag{}).Where("true").Delete(nil).Error
	if err != nil {
		return err
	}

	if len(createTags) > 0 {
		err = tx.Model(&model.DiscussionTag{}).CreateInBatches(&createTags, 1000).Error
		if err != nil {
			return err
		}
	}

	return nil
}

func newReinitDiscTag() migrator.Migrator {
	return &reinitDiscTag{}
}

func init() {
	registerDBMigrator(newReinitDiscTag)
}
