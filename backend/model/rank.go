package model

type RankType uint

const (
	RankTypeContribute RankType = iota + 1
)

type Rank struct {
	Base
	Type    RankType `gorm:"column:type;index:idx_rank_type_score" json:"type"`
	ScoreID uint     `gorm:"column:score_id;type:bigint" json:"score_id"`
	Score   float64  `gorm:"column:score;index:idx_rank_type_score" json:"score"`
}

func init() {
	registerAutoMigrate(&Rank{})
}
