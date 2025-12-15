package model

type AIInsight struct {
	Base

	ForumID uint   `json:"forum_id" gorm:"column:forum_id;type:bigint"`
	Keyword string `json:"keyword" gorm:"column:keyword;type:text"`
}

func init() {
	registerAutoMigrate(&AIInsight{})
}
