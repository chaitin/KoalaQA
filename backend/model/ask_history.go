package model

type AskSession struct {
	Base

	UUID    string `json:"uuid" gorm:"column:uuid;type:text;index"`
	UserID  uint   `json:"user_id" gorm:"user_id;type:bigint"`
	Bot     bool   `json:"bot" gorm:"column:bot"`
	Content string `json:"content" gorm:"column:content"`
}

func init() {
	registerAutoMigrate(&AskSession{})
}
