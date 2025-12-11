package model

type DiscussionTag struct {
	Base
	ForumID uint   `json:"forum_id" gorm:"column:forum_id;type:bigint;uniqueIndex:udx_discussion_tag_forum_name"`
	Name    string `json:"name" gorm:"column:name;type:text;uniqueIndex:udx_discussion_tag_forum_name"`
	Count   int    `json:"count" gorm:"column:count;type:bigint;index"`
}

func init() {
	registerAutoMigrate(&DiscussionTag{})
}
