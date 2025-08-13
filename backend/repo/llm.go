package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type LLM struct {
	base[*model.LLM]
}

func newLLM(db *database.DB) *LLM {
	return &LLM{
		base: base[*model.LLM]{
			db: db,
			m:  &model.LLM{},
		},
	}
}

func (l *LLM) GetChatModel(ctx context.Context) (*model.LLM, error) {
	var res model.LLM
	if err := l.base.model(ctx).Where("type = ?", model.LLMTypeChat).First(&res).Error; err != nil {
		return nil, err
	}
	return &res, nil
}

func init() {
	register(newLLM)
}
