package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type UserThird struct {
	base[*model.UserThird]
}

func newUserThird(db *database.DB) *UserThird {
	return &UserThird{
		base: base[*model.UserThird]{
			db: db, m: &model.UserThird{},
		},
	}
}

func init() {
	register(newUserThird)
}
