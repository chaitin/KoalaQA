package model

type HotQuestion struct {
	Base

	GroupID        string `json:"group_id" gorm:"column:group_id;type:text;index"`
	RagID          string `json:"rag_id" gorm:"column:rag_id;type:text"`
	DiscussionUUID string `json:"discussion_uuid" gorm:"column:discussion_uuid;type:text"`
	Content        string `json:"content" gorm:"column:content;type:text"`
}

type HotQuestionGroup struct {
	GroupID  string      `gorm:"column:group_id" json:"group_id"`
	Contents StringArray `gorm:"column:contents;type:text[]" json:"contents"`
}

func init() {
	registerAutoMigrate(&HotQuestion{})
}
