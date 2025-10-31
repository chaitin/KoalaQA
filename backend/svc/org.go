package svc

import (
	"context"
	"errors"

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

func (o *Org) List(ctx context.Context) (*model.ListRes[OrgListItem], error) {
	var res model.ListRes[OrgListItem]

	err := o.repoOrg.List(ctx, &res)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type OrgUpsertReq struct {
	ID       uint             `json:"id"`
	Name     string           `json:"name" binding:"required"`
	ForumIDs model.Int64Array `json:"forum_ids"`
}

func (o *Org) Upsert(ctx context.Context, req OrgUpsertReq) (uint, error) {
	if req.ID > 0 {
		var org model.Org
		err := o.repoOrg.GetByID(ctx, &org, req.ID)
		if err != nil {
			return 0, err
		}

		if org.Builtin && req.Name != org.Name {
			return 0, errors.New("builtin org can not update name")
		}
	}

	err := o.repoForum.FilterIDs(ctx, &req.ForumIDs)
	if err != nil {
		return 0, err
	}

	org := model.Org{
		Base:     model.Base{ID: req.ID},
		Name:     req.Name,
		ForumIDs: req.ForumIDs,
	}
	err = o.repoOrg.Create(ctx, &org)
	if err != nil {
		return 0, err
	}

	return org.ID, nil
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
