package model

type AskSessionSummaryDisc struct {
	Title   string `json:"title"`
	ForumID uint   `json:"forum_id"`
	UUID    string `json:"uuid"`
}

type AskSessionSource uint

const (
	AskSessionSourceWeb AskSessionSource = iota
	AskSessionSourcePlugin
	AskSessionSourceBot
)

type AskSession struct {
	Base

	UUID         string                         `json:"uuid" gorm:"column:uuid;type:text;index"`
	UserID       uint                           `json:"user_id" gorm:"column:user_id;type:bigint"`
	Source       AskSessionSource               `json:"source" gorm:"column:source"`
	Bot          bool                           `json:"bot" gorm:"column:bot;default:false"`
	Canceled     bool                           `json:"canceled" gorm:"column:canceled;default:false"`
	Summary      bool                           `json:"summary" gorm:"column:summary"`
	SummaryDiscs JSONB[[]AskSessionSummaryDisc] `json:"summary_discs" gorm:"column:summary_discs;type:jsonb"`
	Content      string                         `json:"content" gorm:"column:content"`
}

func init() {
	registerAutoMigrate(&AskSession{})
}
