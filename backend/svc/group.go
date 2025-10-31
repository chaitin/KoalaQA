package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Group struct {
	repoG    *repo.Group
	repoUser *repo.User
}

func (g *Group) ListWithItem(ctx context.Context, uid uint, forumID uint) (*model.ListRes[model.GroupWithItem], error) {
	if forumID > 0 {
		ok, err := g.repoUser.HasForumPermission(ctx, uid, forumID)
		if err != nil {
			return nil, err
		}

		if !ok {
			return nil, errPermission
		}
	}

	var res model.ListRes[model.GroupWithItem]
	err := g.repoG.ListWithItem(ctx, forumID, &res.Items)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type GroupUpdateReq struct {
	Groups []model.GroupWithItem `json:"groups"`
}

func (g *Group) Update(ctx context.Context, req GroupUpdateReq) error {
	return g.repoG.UpdateWithItem(ctx, req.Groups)
}

func newGroup(repoG *repo.Group, user *repo.User) *Group {
	return &Group{
		repoG:    repoG,
		repoUser: user,
	}
}

func init() {
	registerSvc(newGroup)
}
