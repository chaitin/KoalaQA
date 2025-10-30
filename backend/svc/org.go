package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Org struct {
	repoOrg  *repo.Org
	repoUser *repo.User
}

type OrgListItem struct {
	model.Org
	Count uint `json:"count"`
}

func (o *Org) List(ctx context.Context) (*model.ListRes[OrgListItem], error) {
	var res model.ListRes[OrgListItem]
	err := o.repoOrg.List(ctx, &res)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type OrgUpsertReq struct {
	ID      uint             `json:"id"`
	Name    string           `json:"name" binding:"required"`
	UserIDs model.Int64Array `json:"user_ids"`
}

func (o *Org) Upsert(ctx context.Context, req OrgUpsertReq) (uint, error) {
	org := model.Org{
		Base: model.Base{ID: req.ID},
		Name: req.Name,
	}
	err := o.repoOrg.Create(ctx, &org)
	if err != nil {
		return 0, err
	}

	if req.ID > 0 {
		err = o.repoUser.Update(ctx, map[string]any{
			"org_id": 0,
		}, repo.QueryWithEqual("org_id", req.ID),
			repo.QueryWithEqual("id", req.UserIDs, repo.EqualOPNotEqAny),
		)
		if err != nil {
			return 0, err
		}
	}

	if len(req.UserIDs) > 0 {
		err = o.repoUser.Update(ctx, map[string]any{
			"org_id": org.ID,
		}, repo.QueryWithEqual("id", req.UserIDs, repo.EqualOPEqAny))
		if err != nil {
			return 0, err
		}
	}

	return org.ID, nil
}

func (o *Org) Delete(ctx context.Context, orgID uint) error {
	err := o.repoUser.Update(ctx, map[string]any{
		"org_id": 0,
	}, repo.QueryWithEqual("org_id", orgID))
	if err != nil {
		return err
	}

	err = o.repoOrg.Delete(ctx, repo.QueryWithEqual("id", orgID))
	if err != nil {
		return err
	}

	return nil
}

func newOrg(org *repo.Org, user *repo.User) *Org {
	return &Org{
		repoOrg:  org,
		repoUser: user,
	}
}

func init() {
	registerSvc(newOrg)
}
