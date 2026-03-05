package model

import (
	"fmt"
)

type StatType uint

const (
	StatTypeVisit StatType = iota + 1
	StatTypeSearch
	StatTypeBotUnknown
	StatTypeBotAccept
	StatTypeDiscussionQA
	StatTypeDiscussionBlog
	StatTypeDiscussionIssue
	StatTypeBotUnknownComment
	StatTypeKnowledgeHit
)

var DiscussionType2StatType = map[DiscussionType]StatType{
	DiscussionTypeQA:    StatTypeDiscussionQA,
	DiscussionTypeBlog:  StatTypeDiscussionBlog,
	DiscussionTypeIssue: StatTypeDiscussionIssue,
}

type Stat struct {
	Base

	StatInfo
	DayTs int64 `gorm:"column:day_ts;type:bigint" json:"day_ts"`
	Count int64 `gorm:"column:count;type:bigint;default:0" json:"count"`
}

type StatInfo struct {
	Type        StatType `gorm:"column:type;uniqueIndex:udx_stat_type_ts_key" json:"type"`
	Ts          int64    `gorm:"column:ts;type:bigint;uniqueIndex:udx_stat_type_ts_key" json:"ts"`
	Key         string   `gorm:"column:key;type:text;uniqueIndex:udx_stat_type_ts_key" json:"key"`
	AssociateID uint     `gorm:"column:assocaite_id;type:bigint;index" json:"associate_id"`
}

type StatTrendItem struct {
	Type  StatType `json:"type"`
	Count int64    `json:"count"`
}

type StatTrend struct {
	Ts    int64                  `json:"ts"`
	Items JSONB[[]StatTrendItem] `json:"items" gorm:"type:jsonb"`
}

type StatInvalidKnowledgeDoc struct {
	Title        string    `json:"title"`
	Type         DocType   `json:"type"`
	DislikeCount int64     `json:"dislike_count"`
	HitCount     int64     `json:"hit_count"`
	UpdatedAt    Timestamp `gorm:"type:timestamp with time zone" json:"updated_at"`
}

type StatInvalidKnowledge struct {
	StatInvalidKnowledgeDoc

	Key string `json:"key"`
}

func (s *StatInfo) UUID() string {
	return fmt.Sprintf("%d_%d_%s", s.Type, s.Ts, s.Key)
}

func init() {
	registerAutoMigrate(&Stat{})
}
