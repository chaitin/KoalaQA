package repo

import (
	"context"
	"time"

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
	return s.model(ctx).Select("COALESCE(SUM(count), 0)").Scopes(opt.Scopes()...).Scan(res).Error
}

func (s *Stat) BotUnknown(ctx context.Context, res *int64, t time.Time) error {
	return s.model(ctx).Where("type = ? AND ts >= ?", model.StatTypeBotUnknown, t.Unix()).Where("key IN (SELECT uuid FROM discussions WHERE created_at >= ?)", t).Count(res).Error
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

func (s *Stat) TrendDay(ctx context.Context, res any, queryFuns ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuns...)

	return s.model(ctx).
		Select("stat, day_ts AS ts, COUNT(*) AS count").
		Scopes(opt.Scopes()...).
		Group("stat, ts").
		Order("ts ASC").
		Find(res).Error
}

func (s *Stat) Trend(ctx context.Context, res any, queryFuns ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuns...)

	return s.model(ctx).
		Select("stat, ts, COUNT(*) AS count").
		Scopes(opt.Scopes()...).
		Group("stat, ts").
		Order("ts ASC").
		Find(res).Error
}

func init() {
	register(newStat)
}
