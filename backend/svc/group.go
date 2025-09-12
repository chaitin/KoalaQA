package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Group struct {
	repoG *repo.Group
}

func (g *Group) ListWithItem(ctx context.Context) (*model.ListRes[model.GroupWithItem], error) {
	var res model.ListRes[model.GroupWithItem]
	err := g.repoG.ListWithItem(ctx, &res.Items)
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

func newGroup(repoG *repo.Group) *Group {
	return &Group{
		repoG: repoG,
	}
}

func init() {
	registerSvc(newGroup)
}
