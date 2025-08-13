package model

const BotKeyDisscution = "disscution"

type Bot struct {
	Base

	Key           string `gorm:"column:key;type:text;uniqueIndex"`
	UserID        uint   `gorm:"column:user_id"`
	Avatar        string `gorm:"column:avatar;type:text"`
	Name          string `gorm:"column:name;type:text"`
	UnknownPrompt string `gorm:"column:unknown_prompt;type:text"`
}

func init() {
	registerAutoMigrate(&Bot{})
}
