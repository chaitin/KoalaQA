package model

type RankType uint

const (
	RankTypeContribute RankType = iota + 1
	RankTypeAIInsight
)

type Rank struct {
	Base
	Type      RankType `gorm:"column:type;index:idx_rank_type_score" json:"type"`
	ScoreID   string   `gorm:"column:score_id;type:text;index" json:"score_id"`
	Score     float64  `gorm:"column:score;index:idx_rank_type_score" json:"score"`
	RagID     string   `gorm:"column:rag_id;type:text;index" json:"rag_id"`
	ForeignID uint     `gorm:"column:foreign_id;type:bigint;default:0" json:"foreign_id"`
	Extra     string   `gorm:"column:extra;type:text" json:"extra"`
	Hit       int64    `gorm:"column:hit;type:bigint;default:1" json:"hit"`
}

type RankTimeGroupItem struct {
	SocreID   string `json:"score_id"`
	ForeignID uint   `json:"foreign_id"`
	Extra     string `json:"extra"`
}

type RankTimeGroup struct {
	Time  Timestamp                  `json:"time"`
	Items JSONB[[]RankTimeGroupItem] `json:"items" gorm:"type:jsonb"`
}

func init() {
	registerAutoMigrate(&Rank{})
}
