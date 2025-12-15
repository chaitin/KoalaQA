package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type AIInsight struct {
	base[*model.AIInsight]
}

func newAIInsight(db *database.DB) *AIInsight {
	return &AIInsight{base: base[*model.AIInsight]{db: db, m: &model.AIInsight{}}}
}

func init() {
	register(newAIInsight)
}
