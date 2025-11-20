package model

import "fmt"

type StatType uint

const (
	StatTypeVisit StatType = iota + 1
	StatTypeSearch
	StatTypeBotUnknown
	StatTypeBotAccept
	StatTypeDiscussionQA
	StatTypeDiscussionBlog
)

type Stat struct {
	Base

	StatInfo
	DayTs int64 `gorm:"column:day_ts;type:bigint" json:"day_ts"`
	Count int64 `gorm:"column:count;type:bigint;default:0" json:"count"`
}

type StatInfo struct {
	Type StatType `gorm:"column:type;uniqueIndex:udx_stat_type_ts_key" json:"type"`
	Ts   int64    `gorm:"column:ts;type:bigint;uniqueIndex:udx_stat_type_ts_key" json:"ts"`
	Key  string   `gorm:"column:key;type:text;uniqueIndex:udx_stat_type_ts_key" json:"key"`
}

type StatTrendItem struct {
	Type  StatType `json:"type"`
	Count int64    `json:"count"`
}

type StatTrend struct {
	Ts    int64                  `json:"ts"`
	Items JSONB[[]StatTrendItem] `json:"items" gorm:"type:jsonb"`
}

func (s *StatInfo) UUID() string {
	return fmt.Sprintf("%d_%d_%s", s.Type, s.Ts, s.Key)
}

func init() {
	registerAutoMigrate(&Stat{})
}
