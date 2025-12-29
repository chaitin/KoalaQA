package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/version"
	"gorm.io/gorm"
)

type Rank struct {
	base[*model.Rank]

	info    *version.Info
	repoBot *Bot
}

func (r *Rank) ListContribute(ctx context.Context, res any, rankType model.RankType) error {
	return r.model(ctx).Select("users.id AS id, ranks.score, users.name, users.avatar").
		Joins("LEFT JOIN users ON users.id::text = ranks.score_id").
		Where("type = ?", rankType).
		Order("score DESC").
		Limit(5).Find(res).Error
}

func (r *Rank) UserContribute(ctx context.Context, rankType model.RankType) ([]model.Rank, error) {
	var t time.Time

	switch rankType {
	case model.RankTypeContribute:
		t = util.WeekTrunc(time.Now().AddDate(0, 0, -7))
	case model.RankTypeAllContribute:
	default:
		return nil, errors.New("invalid contribute rank type")
	}

	var bot model.Bot
	err := r.repoBot.GetByKey(ctx, &bot, model.BotKeyDisscution)
	if err != nil {
		return nil, err
	}

	var res []model.Rank
	err = r.db.WithContext(ctx).Model(&model.User{}).
		Select("? AS type,users.id::text AS score_id, COALESCE(user_comment.answer_disc_count, 0)*0.2+COALESCE(user_comment.accpted_count, 0)*0.4+COALESCE(user_disc.blog_count, 0)*0.25+COALESCE(user_disc.qa_count, 0)*0.15 AS score", rankType).
		Joins("LEFT JOIN (SELECT user_id, COUNT(1) FILTER (WHERE type = 'qa') AS qa_count, COUNT(1) FILTER (WHERE type = 'blog') AS blog_count FROM discussions WHERE created_at >= ? GROUP BY user_id) AS user_disc ON user_disc.user_id = users.id", t).
		Joins("LEFT JOIN (SELECT user_id, COUNT(1) FILTER (WHERE accepted) AS accpted_count, COUNT(DISTINCT discussion_id) AS answer_disc_count FROM comments WHERE created_at >= ? GROUP BY user_id) AS user_comment ON user_comment.user_id = users.id", t).
		Where("users.id != ?", bot.UserID).
		Order("score DESC, score_id ASC").
		Limit(5).
		Find(&res).Error
	if err != nil {
		return nil, err
	}

	for i := range res {
		if res[i].Score == 0 {
			return res[:i], nil
		}
	}

	return res, nil
}

func (r *Rank) GroupByTime(ctx context.Context, rankLimit int, queryFuncs ...QueryOptFunc) (res []model.RankTimeGroup, err error) {
	opt := getQueryOpt(queryFuncs...)

	err = r.db.WithContext(ctx).Table("(?) AS group_rank", r.model(ctx).
		Select("id, score_id, foreign_id, associate_id, extra, DATE_TRUNC('week',created_at, '?') AS time, RANK() OVER ( PARTITION BY DATE_TRUNC('week',created_at, '?') order by score*log(2, 1+hit) DESC, id ASC) AS rank", r.info.TZ(), r.info.TZ()).
		Scopes(opt.Scopes()...),
	).
		Select("time, JSONB_AGG(jsonb_build_object('id', id,'score_id',score_id, 'foreign_id', foreign_id, 'associate_id', associate_id, 'extra', extra)) AS items").
		Where("rank <= ?", rankLimit).
		Group("time").
		Order("time DESC").
		Find(&res).Error

	return
}

func (r *Rank) RefresContribute(ctx context.Context, rankType model.RankType) error {
	ranks, err := r.UserContribute(ctx, rankType)
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(r.m).Where("type = ?", rankType).Delete(nil).Error
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

func (r *Rank) BatchCreate(ctx context.Context, ranks *[]model.Rank) error {
	return r.db.WithContext(ctx).CreateInBatches(ranks, 1000).Error
}

func (r *Rank) UpdateWithExist(ctx context.Context, updateM map[string]any, queryFuncs ...QueryOptFunc) (bool, error) {
	o := getQueryOpt(queryFuncs...)
	res := r.model(ctx).Scopes(o.Scopes()...).Updates(updateM)
	if res.Error != nil {
		return false, res.Error
	}

	return res.RowsAffected > 0, nil
}

func (r *Rank) CreateAIInsight(ctx context.Context, rank *model.Rank, aiInsights []model.DiscussionAIInsight) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Create(rank).Error
		if err != nil {
			return err
		}

		for i := range aiInsights {
			aiInsights[i].RankID = rank.ID
		}

		err = tx.Model(&model.DiscussionAIInsight{}).CreateInBatches(&aiInsights, 1000).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func (r *Rank) ClearExpireAIInsight(ctx context.Context, before time.Time) error {
	err := r.db.WithContext(ctx).Where("type = ? AND created_at < ?", model.RankTypeAIInsight, before).Delete(nil).Error
	if err != nil {
		return err
	}

	err = r.db.WithContext(ctx).Model(&model.DiscussionAIInsight{}).
		Where("rank_id NOT IN (SELECT id FROM ranks)").
		Delete(nil).Error
	if err != nil {
		return err
	}

	return nil
}

func newRank(db *database.DB, bot *Bot, info *version.Info) *Rank {
	return &Rank{base: base[*model.Rank]{db: db, m: &model.Rank{}}, repoBot: bot, info: info}
}

func init() {
	register(newRank)
}
