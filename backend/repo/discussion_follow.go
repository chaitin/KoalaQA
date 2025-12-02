package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type DiscussionFollow struct {
	base[*model.DiscussionFollow]
}

func newDiscussionFollow(db *database.DB) *DiscussionFollow {
	return &DiscussionFollow{base: base[*model.DiscussionFollow]{db: db, m: &model.DiscussionFollow{}}}
}

func init() {
	register(newDiscussionFollow)
}

func (d *DiscussionFollow) ListDiscussion(ctx context.Context, res any, uid uint, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)

	return d.model(ctx).Select("discussions.*").
		Joins("LEFT JOIN discussions ON discussion_follows.discussion_id = discussions.id").
		Where("discussion_follows.user_id = ?", uid).
		Scopes(o.Scopes()...).Find(res).Error
}

func (d *DiscussionFollow) ListUserID(ctx context.Context, discID uint) ([]uint, error) {
	var res []uint
	err := d.model(ctx).Select("user_id").Where("discussion_id = ?", discID).Scan(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (d *DiscussionFollow) Create(ctx context.Context, data *model.DiscussionFollow) error {
	return d.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "discussion_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(data).Error
}
