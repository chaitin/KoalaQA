package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo    *repo.Forum
	repoOrg *repo.Org
}

func newForum(forum *repo.Forum, org *repo.Org) *Forum {
	return &Forum{repo: forum, repoOrg: org}
}

func init() {
	registerSvc(newForum)
}

func (f *Forum) List(ctx context.Context, user model.UserInfo) ([]*model.ForumInfo, error) {
	forumIDs, err := f.repoOrg.ListForumIDs(ctx, user.OrgIDs...)
	if err != nil {
		return nil, err
	}

	if len(forumIDs) == 0 {
		return make([]*model.ForumInfo, 0), nil
	}

	var items []*model.ForumInfo
	err = f.repo.List(ctx, &items,
		repo.QueryWithOrderBy("index ASC"),
		repo.QueryWithEqual("id", forumIDs),
	)
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
