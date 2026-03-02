package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type APIToken struct {
	base[*model.APIToken]
}

func (a *APIToken) GetByToken(ctx context.Context, token string) (*model.APIToken, error) {
	var res model.APIToken
	err := a.model(ctx).Where("token = ?", token).First(&res).Error
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func newAPIToken(db *database.DB) *APIToken {
	return &APIToken{
		base: base[*model.APIToken]{
			db: db, m: &model.APIToken{},
		},
	}
}

func init() {
	register(newAPIToken)
}
