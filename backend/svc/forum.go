package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo     *repo.Forum
	repoOrg  *repo.Org
	repoDisc *repo.Discussion
}

func newForum(forum *repo.Forum, org *repo.Org, disc *repo.Discussion) *Forum {
	return &Forum{repo: forum, repoOrg: org, repoDisc: disc}
}

func init() {
	registerSvc(newForum)
}

type ForumBlog struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}
type ForumRes struct {
	model.ForumInfo
	Blogs []ForumBlog `json:"blogs" gorm:"-"`
}

func (f *Forum) List(ctx context.Context, user model.UserInfo, permissionCheck bool) ([]*ForumRes, error) {
	var forumIDs model.Int64Array

	if permissionCheck {
		var err error
		if user.UID == 0 {
			org, err := f.repoOrg.GetBuiltin(ctx)
			if err != nil {
				return nil, err
			}

			forumIDs = org.ForumIDs
		} else {
			forumIDs, err = f.repoOrg.ListForumIDs(ctx, user.OrgIDs...)
			if err != nil {
				return nil, err
			}
		}

		if len(forumIDs) == 0 {
			return make([]*ForumRes, 0), nil
		}
	}

	var items []*ForumRes
	err := f.repo.List(ctx, &items,
		repo.QueryWithOrderBy("index ASC"),
		repo.QueryWithEqual("id", forumIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		return nil, err
	}

	for i, item := range items {
		if len(item.BlogIDs) == 0 {
			continue
		}

		err = f.repoDisc.List(ctx, &items[i].Blogs, repo.QueryWithEqual("discussions.id", item.BlogIDs, repo.EqualOPEqAny))
		if err != nil {
			return nil, err
		}
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
