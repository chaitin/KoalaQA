package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type HotQuestion struct {
	base[*model.HotQuestion]
}

func newHotQuestion(db *database.DB) *HotQuestion {
	return &HotQuestion{
		base: base[*model.HotQuestion]{
			db: db, m: &model.HotQuestion{},
		},
	}
}

func (h *HotQuestion) Groups(ctx context.Context, limit int, queryFuncs ...QueryOptFunc) ([]model.HotQuestionGroup, error) {
	o := getQueryOpt(queryFuncs...)
	var res []model.HotQuestionGroup
	err := h.db.WithContext(ctx).Table("(?) AS tmp", h.model(ctx).Select("group_id, ARRAY_AGG(content) AS contents").
		Scopes(o.Scopes()...).Group("group_id")).
		Limit(limit).Order("array_length(contents,1) DESC, group_id DESC").Find(&res).Error
	if err != nil {
		return nil, err
	}

	return res, nil
}

func init() {
	register(newHotQuestion)
}
