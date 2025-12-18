package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo        *repo.Forum
	repoOrg     *repo.Org
	repoDisc    *repo.Discussion
	repoDiscTag *repo.DiscussionTag
}

func newForum(forum *repo.Forum, org *repo.Org, disc *repo.Discussion, discTag *repo.DiscussionTag) *Forum {
	return &Forum{repo: forum, repoOrg: org, repoDisc: disc, repoDiscTag: discTag}
}

func init() {
	registerSvc(newForum)
}

type ForumBlog struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

type ForumTag struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Count uint   `json:"count"`
}
type ForumRes struct {
	model.ForumInfo
	Blogs []ForumBlog `json:"blogs" gorm:"-"`
	Tags  []ForumTag  `json:"tags" gorm:"-"`
}

func (f *Forum) List(ctx context.Context, user model.UserInfo, permissionCheck bool) ([]*ForumRes, error) {
	var forumIDs model.Int64Array

	if permissionCheck {
		var err error
		if user.UID == 0 {
			org, err := f.repoOrg.GetDefaultOrg(ctx)
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

		if len(item.BlogIDs) > 0 {
			err = f.repoDisc.List(ctx, &items[i].Blogs, repo.QueryWithEqual("discussions.id", item.BlogIDs, repo.EqualOPEqAny))
			if err != nil {
				return nil, err
			}
		}

		if len(item.TagIDs) > 0 {
			err = f.repoDiscTag.List(ctx, &items[i].Tags, repo.QueryWithEqual("id", item.TagIDs, repo.EqualOPEqAny))
			if err != nil {
				return nil, err
			}
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

type ForumListTagReq struct {
	*model.Pagination
}

func (f *Forum) ListForumAllTag(ctx context.Context, forumID uint, req ForumListTagReq) (*model.ListRes[model.DiscussionTag], error) {
	var res model.ListRes[model.DiscussionTag]

	err := f.repoDiscTag.List(ctx, &res.Items,
		repo.QueryWithEqual("forum_id", forumID),
		repo.QueryWithPagination(req.Pagination),
		repo.QueryWithEqual("count", 0, repo.EqualOPGT),
		repo.QueryWithOrderBy("COUNT DESC, id ASC"),
	)
	if err != nil {
		return nil, err
	}

	err = f.repoDiscTag.Count(ctx, &res.Total,
		repo.QueryWithEqual("forum_id", forumID),
		repo.QueryWithEqual("count", 0, repo.EqualOPGT),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type ListForumTagsReq struct {
	Type *model.DiscussionType `form:"type"`
}

func (f *Forum) ListForumTags(ctx context.Context, forumID uint, req ListForumTagsReq) (*model.ListRes[model.DiscussionTag], error) {
	var forum model.Forum
	err := f.repo.GetByID(ctx, &forum, forumID)
	if err != nil {
		return nil, err
	}

	if len(forum.TagIDs) == 0 {
		return &model.ListRes[model.DiscussionTag]{
			Items: make([]model.DiscussionTag, 0),
		}, nil
	}

	var res model.ListRes[model.DiscussionTag]

	if req.Type != nil {
		err = f.repoDisc.FilterTagIDs(ctx, &forum.TagIDs, repo.QueryWithEqual("type", req.Type))
		if err != nil {
			return nil, err
		}
		if len(forum.TagIDs) == 0 {
			res.Items = make([]model.DiscussionTag, 0)
			return &res, nil
		}
	}

	err = f.repoDiscTag.List(ctx, &res.Items,
		repo.QueryWithEqual("id", forum.TagIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("count", 0, repo.EqualOPGT),
		repo.QueryWithOrderBy("COUNT DESC, id ASC"),
	)
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))

	return &res, nil
}
