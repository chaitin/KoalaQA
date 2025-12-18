package model

type DiscussionAIInsight struct {
	Base

	RankID         uint   `gorm:"column:rank_id;type:bigint" json:"rank_id"`
	DiscussionUUID string `gorm:"column:discussion_uuid;type:text" json:"discussion_id"`
	Title          string `gorm:"column:title;type:text" json:"title"`
}

func init() {
	registerAutoMigrate(&DiscussionAIInsight{})
}
