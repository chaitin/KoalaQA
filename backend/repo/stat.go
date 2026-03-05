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

func (s *Stat) Upsert(ctx context.Context, stats ...model.Stat) error {
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

func (s *Stat) TrendDay(ctx context.Context, queryFuns ...QueryOptFunc) ([]model.StatTrend, error) {
	opt := getQueryOpt(queryFuns...)

	var res []model.StatTrend

	err := s.db.WithContext(ctx).Table("(?) AS stat", s.model(ctx).
		Select("type, day_ts AS ts, COUNT(*) AS count").
		Scopes(opt.Scopes()...).
		Group("type, day_ts")).
		Select("ts, jsonb_agg(jsonb_build_object('type', type, 'count', count)) AS items").
		Group("ts").
		Order("ts ASC").
		Find(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *Stat) Trend(ctx context.Context, queryFuns ...QueryOptFunc) ([]model.StatTrend, error) {
	opt := getQueryOpt(queryFuns...)

	var res []model.StatTrend

	err := s.db.WithContext(ctx).Table("(?) AS stat", s.model(ctx).
		Select("type, ts, COUNT(*) AS count").
		Scopes(opt.Scopes()...).
		Group("type, ts")).
		Select("ts, jsonb_agg(jsonb_build_object('type', type, 'count', count)) AS items").
		Group("ts").
		Order("ts ASC").
		Find(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *Stat) InvalidKnowledge(ctx context.Context, queryFuncs ...QueryOptFunc) ([]model.StatInvalidKnowledge, error) {
	var res []model.StatInvalidKnowledge

	o := getQueryOpt(queryFuncs...)
	err := s.model(ctx).Scopes(o.Scopes()...).
		Joins("LEFT JOIN comment_likes ON stats.assocaite_id = comment_likes.discussion_id AND comment_likes.state = ?", model.CommentLikeStateDislike).
		Joins("JOIN kb_documents ON stats.key::bigint = kb_documents.id").
		Joins("LEFT JOIN comments ON comments.id = comment_likes.comment_id").
		Where("stats.type = ?", model.StatTypeKnowledgeHit).
		Where("stats.assocaite_id IN (select id from discussions where type = ?)", model.DiscussionTypeQA).
		Where("comments.bot = ?", true).
		Group("stats.key").
		Select("stats.key, MAX(kb_documents.title) AS title, MAX(kb_documents.doc_type) AS type, MAX(kb_documents.updated_at) as updated_at, COUNT(DISTINCT comment_likes.id) AS dislike_count, COUNT(DISTINCT stats.key) AS hit_count").
		Find(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func init() {
	register(newStat)
}
