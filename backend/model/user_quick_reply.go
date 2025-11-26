package model

type UserQuickReply struct {
	Base

	UserID  uint   `gorm:"column:user_id" json:"user_id"`
	Name    string `gorm:"column:name;type:text" json:"name"`
	Content string `gorm:"column:content;type:text" json:"content"`
	Index   uint   `gorm:"column:index" json:"index"`
}

func init() {
	registerAutoMigrate(&UserQuickReply{})
}
