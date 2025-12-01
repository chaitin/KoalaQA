package model

type DiscussionFollow struct {
	Base

	DiscussionID uint `gorm:"column:discussion_id;type:bigint;uniqueIndex:udx_discussion_follow_discussion_user_id"`
	UserID       uint `gorm:"column:user_id;type:bigint;uniqueIndex:udx_discussion_follow_discussion_user_id;index"`
}
