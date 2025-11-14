package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type UserReview struct {
	base[*model.UserReview]
}

func (u *UserReview) ListWithUser(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return u.model(ctx).
		Select("user_reviews.*, users.email as user_email, users.name as user_name, users.avatar as user_avatar").
		Joins("LEFT JOIN users ON users.id = user_reviews.user_id").
		Scopes(opt.Scopes()...).
		Find(res).Error
}

func (u *UserReview) CreateNotExist(ctx context.Context, data *model.UserReview) (bool, error) {
	res := u.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "type"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(data)

	if res.Error != nil {
		return false, res.Error
	}

	return res.RowsAffected > 0, nil
}

func newUserReview(db *database.DB) *UserReview {
	return &UserReview{
		base: base[*model.UserReview]{
			db: db, m: &model.UserReview{},
		},
	}
}

func init() {
	register(newUserReview)
}
