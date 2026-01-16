package model

type AskSessionSummaryDisc struct {
	Title   string `json:"title"`
	ForumID uint   `json:"forum_id"`
	UUID    string `json:"uuid"`
}

type AskSession struct {
	Base

	UUID         string                         `json:"uuid" gorm:"column:uuid;type:text;index"`
	UserID       uint                           `json:"user_id" gorm:"user_id;type:bigint"`
	Bot          bool                           `json:"bot" gorm:"column:bot;default:false"`
	Summary      bool                           `json:"summary" gorm:"column:summary"`
	SummaryDiscs JSONB[[]AskSessionSummaryDisc] `json:"summary_discs" gorm:"column:summary_discs;type:jsonb"`
	Content      string                         `json:"content" gorm:"column:content"`
}

func init() {
	registerAutoMigrate(&AskSession{})
}
