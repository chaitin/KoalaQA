package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type DiscussionFollow struct {
	discFollow *repo.DiscussionFollow
	disc       *repo.Discussion
	pub        mq.Publisher
}

func newDiscussionFollow(discFollow *repo.DiscussionFollow, disc *repo.Discussion, pub mq.Publisher) *DiscussionFollow {
	return &DiscussionFollow{discFollow: discFollow, disc: disc, pub: pub}
}

func init() {
	registerSvc(newDiscussionFollow)
}

type ListDiscussionFollowReq struct {
	*model.Pagination
}

func (d *DiscussionFollow) ListDiscussion(ctx context.Context, uid uint, req ListDiscussionFollowReq) (*model.ListRes[model.Discussion], error) {
	var res model.ListRes[model.Discussion]
	err := d.discFollow.ListDiscussion(ctx, &res.Items, uid,
		repo.QueryWithOrderBy("discussion_follows.created_at DESC"),
		repo.QueryWithPagination(req.Pagination),
	)
	if err != nil {
		return nil, err
	}

	err = d.discFollow.Count(ctx, &res.Total, repo.QueryWithEqual("user_id", uid))
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (d *DiscussionFollow) Follow(ctx context.Context, uid uint, discUUID string) (uint, error) {
	disc, err := d.disc.GetByUUID(ctx, discUUID)
	if err != nil {
		return 0, err
	}

	follow := model.DiscussionFollow{
		DiscussionID: disc.ID,
		UserID:       uid,
	}
	err = d.discFollow.Upsert(ctx, &follow)
	if err != nil {
		return 0, err
	}

	switch disc.Type {
	case model.DiscussionTypeBlog, model.DiscussionTypeQA:
		d.pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
			DiscussHeader: disc.Header(),
			Type:          model.MsgNotifyTypeFollowDiscuss,
			FromID:        uid,
			ToID:          disc.UserID,
		})
	}

	return follow.ID, nil
}

func (d *DiscussionFollow) Unfollow(ctx context.Context, uid uint, discUUID string) error {
	disc, err := d.disc.GetByUUID(ctx, discUUID)
	if err != nil {
		return err
	}

	err = d.discFollow.Delete(ctx, repo.QueryWithEqual("discussion_id", disc.ID), repo.QueryWithEqual("user_id", uid))
	if err != nil {
		return err
	}

	return nil
}

type DiscussionListFollowRes struct {
	Followed bool  `json:"followed"`
	Follower int64 `json:"follower"`
}

func (d *DiscussionFollow) FollowInfo(ctx context.Context, uid uint, discUUID string) (*DiscussionListFollowRes, error) {
	disc, err := d.disc.GetByUUID(ctx, discUUID)
	if err != nil {
		return nil, err
	}

	var res DiscussionListFollowRes
	res.Followed, err = d.discFollow.Exist(ctx, repo.QueryWithEqual("discussion_id", disc.ID), repo.QueryWithEqual("user_id", uid))
	if err != nil {
		return nil, err
	}

	err = d.discFollow.Count(ctx, &res.Follower, repo.QueryWithEqual("discussion_id", disc.ID))
	if err != nil {
		return nil, err
	}

	return &res, nil
}
