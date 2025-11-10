package repo

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type Rank struct {
	base[*model.Rank]
}

func (r *Rank) ListContribute(ctx context.Context, res any) error {
	return r.model(ctx).Select("ranks.score_id AS id, ranks.score, users.name, users.avatar").
		Joins("LEFT JOIN users ON users.id = ranks.score_id").
		Where("type = ?", model.RankTypeContribute).
		Order("score DESC").
		Limit(5).Find(res).Error
}

func (r *Rank) UserContribute(ctx context.Context) ([]model.Rank, error) {
	t := time.Now().AddDate(0, 0, -7)
	var res []model.Rank
	err := r.db.WithContext(ctx).Model(&model.User{}).
		Select("? AS type,users.id AS score_id, COALESCE(user_comment.answer_disc_count, 0)*0.2+COALESCE(user_comment.accpted_count, 0)*0.4+COALESCE(user_disc.blog_count, 0)*0.25+COALESCE(user_disc.qa_count, 0)*0.15 AS score", model.RankTypeContribute).
		Joins("LEFT JOIN (SELECT user_id, COUNT(1) FILTER (WHERE type = 'qa') AS qa_count, COUNT(1) FILTER (WHERE type = 'blog') AS blog_count FROM discussions WHERE created_at >= ? GROUP BY user_id) AS user_disc ON user_disc.user_id = users.id", t).
		Joins("LEFT JOIN (SELECT user_id, COUNT(1) FILTER (WHERE accepted) AS accpted_count, COUNT(DISTINCT discussion_id) AS answer_disc_count FROM comments WHERE created_at >= ? GROUP BY user_id) AS user_comment ON user_comment.user_id = users.id", t).
		Order("score DESC, score_id ASC").
		Limit(5).
		Find(&res).Error
	if err != nil {
		return nil, err
	}

	if len(res) > 0 && res[0].Score == 0 {
		return make([]model.Rank, 0), nil
	}

	return res, nil
}

func (r *Rank) RefresContribute(ctx context.Context) error {
	ranks, err := r.UserContribute(ctx)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(r.m).Where("type = ?", model.RankTypeContribute).Delete(nil).Error
		if err != nil {
			return err
		}

		if len(ranks) == 0 {
			return nil
		}

		err = tx.CreateInBatches(&ranks, 1000).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func newRank(db *database.DB) *Rank {
	return &Rank{base: base[*model.Rank]{db: db, m: &model.Rank{}}}
}

func init() {
	register(newRank)
}
