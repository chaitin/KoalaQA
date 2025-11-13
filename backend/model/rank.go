package model

type RankType uint

const (
	RankTypeContribute RankType = iota + 1
	RanTypeAIInsight
)

type Rank struct {
	Base
	Type    RankType `gorm:"column:type;index:idx_rank_type_score;uniqueIndex:udx_rank_type_id" json:"type"`
	ScoreID string   `gorm:"column:score_id;type:text;index;uniqueIndex:udx_rank_type_id" json:"score_id"`
	Score   float64  `gorm:"column:score;index:idx_rank_type_score" json:"score"`
	RagID   string   `gorm:"column:rag_id;type:text;index" json:"rag_id"`
	Hit     int64    `gorm:"column:hit;type:bigint;default:1" json:"hit"`
}

type RankTimeGroup struct {
	Time     Timestamp   `json:"time"`
	ScoreIDs StringArray `json:"score_ids"`
}

func init() {
	registerAutoMigrate(&Rank{})
}
