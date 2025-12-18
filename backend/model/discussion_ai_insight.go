package model

type DiscussionAIInsight struct {
	Base

	RankID       uint   `gorm:"column:rank_id;type:bigint" json:"rank_id"`
	DiscussionID uint   `gorm:"column:discussion_id;type:bigint" json:"discussion_id"`
	Title        string `gorm:"column:title;type:text" json:"title"`
}
