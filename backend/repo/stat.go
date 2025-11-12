package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Stat struct {
	base[*model.Stat]
}

func newStat(db *database.DB) *Stat {
	return &Stat{base: base[*model.Stat]{db: db, m: &model.Stat{}}}
}

func (s *Stat) Sum(ctx context.Context, res *int64, queryFuns ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuns...)
	return s.model(ctx).Select("SUM(count)").Scopes(opt.Scopes()...).Scan(res).Error
}

func (s *Stat) Create(ctx context.Context, stats ...model.Stat) error {
	if len(stats) == 0 {
		return nil
	}

	return s.model(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "type"}, {Name: "ts"}, {Name: "key"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"count": gorm.Expr("stats.count+EXCLUDED.count"),
		}),
	}).
		CreateInBatches(&stats, 1000).Error
}

func init() {
	register(newStat)
}
