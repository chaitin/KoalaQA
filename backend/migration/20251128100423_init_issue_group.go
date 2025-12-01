package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type initIssueGroup struct{}

func (m *initIssueGroup) Version() int64 {
	return 20251128100423
}

func (m *initIssueGroup) Migrate(tx *gorm.DB) error {
	var maxGroupIndex uint
	err := tx.Model(&model.Group{}).Select("MAX(index)").Scan(&maxGroupIndex).Error
	if err != nil {
		return err
	}

	group := model.Group{
		Index: maxGroupIndex + 1,
		Name:  "类型",
	}
	err = tx.Model(&model.Group{}).Create(&group).Error
	if err != nil {
		return err
	}

	groupItems := []model.GroupItem{
		{
			GroupID: group.ID,
			Index:   0,
			Name:    "Bug",
		},
		{
			GroupID: group.ID,
			Index:   1,
			Name:    "需求",
		},
	}

	err = tx.Model(&model.GroupItem{}).CreateInBatches(&groupItems, 10).Error
	if err != nil {
		return err
	}

	forumGroups := model.ForumGroups{
		Type:     model.DiscussionTypeIssue,
		GroupIDs: model.Int64Array{int64(group.ID)},
	}

	return tx.Model(&model.Forum{}).Where("true").
		UpdateColumn("groups", gorm.Expr("groups || ?", model.NewJSONB(forumGroups))).Error

}

func newInitIssueGroup() migrator.Migrator {
	return &initIssueGroup{}
}

func init() {
	registerDBMigrator(newInitIssueGroup)
}
