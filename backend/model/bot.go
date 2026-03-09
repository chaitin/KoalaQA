package model

const BotKeyDisscution = "disscution"

type Bot struct {
	Base

	BotInfo
	Key    string `gorm:"column:key;type:text;uniqueIndex"`
	UserID uint   `gorm:"column:user_id"`
}

type BotInfo struct {
	Avatar         string `gorm:"column:avatar;type:text" json:"avatar"`
	Name           string `gorm:"column:name;type:text" json:"name"`
	UnknownPrompt  string `gorm:"column:unknown_prompt;type:text" json:"unknown_prompt"`
	AnswerRef      bool   `gorm:"column:answer_ref" json:"answer_ref"`
	KeywordsEnable bool   `gorm:"column:keywords_enable" json:"keywords_enable"`
	Keywords       string `gorm:"column:keywords;type:text" json:"keywords"`
}

func init() {
	registerAutoMigrate(&Bot{})
}
