package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo    *repo.Forum
	repoOrg *repo.Org
	svcAuth *Auth
}

func newForum(forum *repo.Forum, org *repo.Org, auth *Auth) *Forum {
	return &Forum{repo: forum, repoOrg: org, svcAuth: auth}
}

func init() {
	registerSvc(newForum)
}

func (f *Forum) List(ctx context.Context, user model.UserInfo, permissionCheck bool) ([]*model.ForumInfo, error) {
	var forumIDs model.Int64Array

	if permissionCheck {
		var err error
		if user.UID == 0 {
			auth, err := f.svcAuth.Get(ctx)
			if err != nil {
				return nil, err
			}

			for _, v := range auth.PublicForumIDs {
				forumIDs = append(forumIDs, int64(v))
			}
		} else {
			forumIDs, err = f.repoOrg.ListForumIDs(ctx, user.OrgIDs...)
			if err != nil {
				return nil, err
			}
		}

	}

	var items []*model.ForumInfo
	err := f.repo.List(ctx, &items,
		repo.QueryWithOrderBy("index ASC"),
		repo.QueryWithEqual("id", forumIDs, repo.EqualOPEqAny),
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
