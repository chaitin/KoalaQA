package model

const BotKeyDisscution = "disscution"

type Bot struct {
	Base

	BotInfo
	Key    string `gorm:"column:key;type:text;uniqueIndex"`
	UserID uint   `gorm:"column:user_id"`
}

type BotInfo struct {
	Avatar           string `gorm:"column:avatar;type:text" json:"avatar" form:"-" swaggerignore:"true"`
	Name             string `gorm:"column:name;type:text" json:"name" form:"name" binding:"required"`
	UnknownPrompt    string `gorm:"column:unknown_prompt;type:text" json:"unknown_prompt" form:"unknown_prompt"`
	AnswerRef        bool   `gorm:"column:answer_ref" json:"answer_ref" form:"answer_ref"`
	KeywordsEnable   bool   `gorm:"column:keywords_enable" json:"keywords_enable" form:"keywords_enable"`
	Keywords         string `gorm:"column:keywords;type:text" json:"keywords" form:"keywords"`
	GeneralKnowledge bool   `gorm:"column:general_knowledge" json:"general_knowledge" form:"general_knowledge"`
}

func init() {
	registerAutoMigrate(&Bot{})
}
