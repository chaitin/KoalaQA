package svc

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Org struct {
	repoOrg   *repo.Org
	repoForum *repo.Forum
	repoUser  *repo.User
}

type OrgListItem struct {
	model.Org
	ForumNames model.StringArray `json:"forum_names" gorm:"column:forum_names;type:text[]"`
	Count      uint              `json:"count"`
}

type OrgListReq struct {
	Name *string `form:"name"`
}

func (o *Org) List(ctx context.Context, req OrgListReq) (*model.ListRes[OrgListItem], error) {
	var res model.ListRes[OrgListItem]

	err := o.repoOrg.List(ctx, &res.Items,
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type OrgUpsertReq struct {
	Name     string           `json:"name" binding:"required"`
	ForumIDs model.Int64Array `json:"forum_ids"`
}

func (o *Org) Create(ctx context.Context, req OrgUpsertReq) (uint, error) {
	err := o.repoForum.FilterIDs(ctx, &req.ForumIDs)
	if err != nil {
		return 0, err
	}

	org := model.Org{
		Name:     req.Name,
		ForumIDs: req.ForumIDs,
	}
	err = o.repoOrg.Create(ctx, &org)
	if err != nil {
		return 0, err
	}

	return org.ID, nil
}

func (o *Org) Update(ctx context.Context, orgID uint, req OrgUpsertReq) error {
	var org model.Org
	err := o.repoOrg.GetByID(ctx, &org, orgID)
	if err != nil {
		return err
	}

	if org.Builtin && req.Name != org.Name {
		return errors.New("builtin org can not update name")
	}

	err = o.repoForum.FilterIDs(ctx, &req.ForumIDs)
	if err != nil {
		return err
	}

	err = o.repoOrg.Update(ctx, map[string]any{
		"name":       req.Name,
		"forum_ids":  req.ForumIDs,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", orgID))
	if err != nil {
		return err
	}

	return nil
}

func (o *Org) Delete(ctx context.Context, orgID uint) error {
	var org model.Org
	err := o.repoOrg.GetByID(ctx, &org, orgID)
	if err != nil {
		return err
	}

	if org.Builtin {
		return errors.New("builtin org can not delete")
	}

	err = o.repoOrg.Delete(ctx, orgID)
	if err != nil {
		return err
	}

	return nil
}

func newOrg(org *repo.Org, user *repo.User, forum *repo.Forum) *Org {
	return &Org{
		repoOrg:   org,
		repoForum: forum,
		repoUser:  user,
	}
}

func init() {
	registerSvc(newOrg)
}
