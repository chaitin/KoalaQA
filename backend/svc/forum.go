package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo *repo.Forum
}

func newForum(forum *repo.Forum) *Forum {
	return &Forum{repo: forum}
}

func init() {
	registerSvc(newForum)
}

func (f *Forum) List(ctx context.Context) ([]*model.ForumInfo, error) {
	var items []*model.ForumInfo
	err := f.repo.List(ctx, &items, repo.QueryWithOrderBy("index ASC"))
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (f *Forum) GetByID(ctx context.Context, id uint) (*model.Forum, error) {
	var item model.Forum
	err := f.repo.GetByID(ctx, &item, id)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

type ForumUpdateReq struct {
	Forums []model.ForumInfo `json:"forums" binding:"dive"`
}

func (f *Forum) Update(ctx context.Context, req ForumUpdateReq) error {
	if err := f.repo.UpdateWithGroup(ctx, req.Forums); err != nil {
		return err
	}
	return nil
}
