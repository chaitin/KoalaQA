package model

type Comment struct {
	Base

	DiscussionID uint   `gorm:"column:discussion_id;type:bigint;index"`
	ParentID     uint   `gorm:"column:parent_id;type:bigint;index"`
	UserID       uint   `gorm:"column:user_id;type:bigint;index"`
	RagID        string `gorm:"column:rag_id;type:text;index"`

	Content    string    `gorm:"column:content;type:text"`
	Accepted   bool      `gorm:"column:accepted;type:boolean"`
	AcceptedAt Timestamp `gorm:"column:accepted_at;type:timestamp with time zone"`
	Like       uint      `gorm:"column:like;type:bigint"`
	Dislike    uint      `gorm:"column:dislike;type:bigint"`
	Bot        bool      `gorm:"column:bot;type:boolean"`
}

type CommentDetail struct {
	Comment
	UserName string `json:"user_name"`
}

func init() {
	registerAutoMigrate(&Comment{})
}
