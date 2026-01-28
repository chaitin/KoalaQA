package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type UserPortrait struct {
	base[*model.UserPortrait]
}

func newUserPortrait(db *database.DB) *UserPortrait {
	return &UserPortrait{
		base: base[*model.UserPortrait]{
			db: db, m: &model.UserPortrait{},
		},
	}
}

func (u *UserPortrait) ListWithUser(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return u.model(ctx).Select("user_portraits.*, users.name as user_name").
		Joins("LEFT JOIN users ON users.id = user_portraits.created_by").
		Scopes(opt.Scopes()...).
		Find(res).Error
}

func init() {
	register(newUserPortrait)
}
