package model

type TrendType uint

const (
	TrendTypeCreateDiscuss TrendType = iota + 1
	TrendTypeAnswerAccepted
	TrendTypeAnswer
)

type Trend struct {
	Base

	UserID    uint      `gorm:"column:user_id" json:"user_id"` // 谁的行为
	TrendType TrendType `gorm:"column:trend_type" json:"trend_type"`

	DiscussHeader
}

func init() {
	registerAutoMigrate(&Trend{})
}
