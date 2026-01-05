package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type DiscussionAIInsight struct {
	base[*model.DiscussionAIInsight]
}

func newDiscussionAIInsight(db *database.DB) *DiscussionAIInsight {
	return &DiscussionAIInsight{base: base[*model.DiscussionAIInsight]{db: db, m: &model.DiscussionAIInsight{}}}
}

func (d *DiscussionAIInsight) ListByRank(ctx context.Context, res any, rankID uint) error {
	return d.model(ctx).Select("discussion_ai_insights.*, discussions.id IS NULL AS deleted").
		Joins("LEFT JOIN discussions ON discussions.uuid = discussion_ai_insights.discussion_uuid").
		Where("discussion_ai_insights.rank_id = ?", rankID).
		Find(res).Error
}

func (d *DiscussionAIInsight) ListDiscByRank(ctx context.Context, res any, rankID uint, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)
	return d.model(ctx).Scopes(opt.Scopes()...).
		Joins("LEFT JOIN discussions ON discussions.uuid = discussion_ai_insights.discussion_uuid").
		Where("discussion_ai_insights.rank_id = ? AND discussions.id IS NOT NULL", rankID).
		Find(res).Error
}

func init() {
	register(newDiscussionAIInsight)
}
