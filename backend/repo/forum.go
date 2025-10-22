package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Forum struct {
	base[*model.Forum]
}

func newForum(db *database.DB) *Forum {
	return &Forum{base: base[*model.Forum]{db: db, m: &model.Forum{}}}
}

func init() {
	register(newForum)
}

func (f *Forum) GetFirstID(ctx context.Context) (uint, error) {
	var id uint
	if err := f.model(ctx).Order("id ASC").Pluck("id", &id).Error; err != nil {
		return 0, err
	}
	return id, nil
}
