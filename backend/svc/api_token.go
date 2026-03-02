package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type APIToken struct {
	apiToken *repo.APIToken
}

func newAPIToken(apiToken *repo.APIToken) *APIToken {
	return &APIToken{
		apiToken: apiToken,
	}
}

func (a *APIToken) List(ctx context.Context) (*model.ListRes[model.APIToken], error) {
	var res model.ListRes[model.APIToken]
	err := a.apiToken.List(ctx, &res.Items, repo.QueryWithOrderBy("created_at DESC, id DESC"))
	if err != nil {
		return nil, err
	}
	res.Total = int64(len(res.Items))
	return &res, nil
}

type APITokenCreateReq struct {
	Name string `json:"name" binding:"required"`
}

func (a *APIToken) Create(ctx context.Context, req APITokenCreateReq) (uint, error) {
	apiToken := model.APIToken{
		Name:  req.Name,
		Token: util.RandomString(32),
	}
	err := a.apiToken.Create(ctx, &apiToken)
	if err != nil {
		return 0, err
	}

	return apiToken.ID, nil
}

func (a *APIToken) Delete(ctx context.Context, id uint) error {
	err := a.apiToken.Delete(ctx, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	return nil
}

func init() {
	registerSvc(newAPIToken)
}
