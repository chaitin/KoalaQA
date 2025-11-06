package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Trend struct {
	base[*model.Trend]
}

func newTrend(db *database.DB) *Trend {
	return &Trend{base: base[*model.Trend]{db: db, m: &model.Trend{}}}
}

func init() {
	register(newTrend)
}
