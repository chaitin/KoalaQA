package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type Discussion struct {
	base[*model.Discussion]
}

func newDiscussion(db *database.DB) *Discussion {
	return &Discussion{base: base[*model.Discussion]{db: db, m: &model.Discussion{}}}
}

func init() {
	register(newDiscussion)
}

func (d *Discussion) GetByUUID(ctx context.Context, uuid string) (*model.Discussion, error) {
	var res model.Discussion
	if err := d.model(ctx).Where("uuid = ?", uuid).First(&res).Error; err != nil {
		return nil, err
	}
	return &res, nil
}

func (d *Discussion) DetailByUUID(ctx context.Context, uid uint, uuid string) (*model.DiscussionDetail, error) {
	var id uint
	if err := d.model(ctx).Where("uuid = ?", uuid).Select("id").First(&id).Error; err != nil {
		return nil, err
	}
	return d.Detail(ctx, uid, id)
}

func (d *Discussion) Detail(ctx context.Context, uid uint, id uint) (*model.DiscussionDetail, error) {
	var res model.DiscussionDetail
	err := d.model(ctx).Where("discussions.id = ?", id).
		Joins("left join users on users.id = discussions.user_id").
		Select("discussions.*, users.name as user_name, users.avatar as user_avatar").
		First(&res).Error
	if err != nil {
		return nil, err
	}
	if len(res.GroupIDs) > 0 {
		err = d.db.WithContext(ctx).
			Model(&model.GroupItem{}).
			Where("id = ANY(?)", res.GroupIDs).
			Find(&res.Groups).Error
		if err != nil {
			return nil, err
		}
	}

	var accepteComment model.DiscussionComment
	_ = d.db.WithContext(ctx).
		Model(&model.Comment{}).
		Where("comments.discussion_id = ?", id).
		Where("comments.accepted = ?", true).
		Joins("left join users on users.id = comments.user_id").
		Select("comments.*, users.name as user_name, users.avatar as user_avatar").
		First(&accepteComment).Error
	if accepteComment.ID > 0 {
		res.Accepted = &accepteComment
	}

	commentLikeScope := func(tx *gorm.DB) *gorm.DB {
		return tx.Joins(`LEFT JOIN (SELECT comment_id,
			COUNT(*) FILTER (WHERE state = ?) AS like,
			COUNT(*) FILTER (WHERE state = ?) AS dislike,
			SUM(state) FILTER (WHERE user_id = ?) AS user_like_state
			FROM comment_likes GROUP BY comment_id) AS tmp_like ON tmp_like.comment_id = comments.id`,
			model.CommentLikeStateLike, model.CommentLikeStateDislike, uid)
	}

	err = d.db.WithContext(ctx).
		Model(&model.Comment{}).
		Where("comments.parent_id = ?", 0).
		Where("comments.discussion_id = ?", id).
		Joins("left join users on users.id = comments.user_id").
		Order("comments.created_at asc").
		Select("comments.*, users.name as user_name, users.avatar as user_avatar, tmp_like.like, tmp_like.dislike, tmp_like.user_like_state").
		Scopes(commentLikeScope).
		Find(&res.Comments).Error
	if err != nil {
		return nil, err
	}

	for i, c := range res.Comments {
		var replies []model.DiscussionReply
		err = d.db.WithContext(ctx).
			Model(&model.Comment{}).
			Joins("left join users on users.id = comments.user_id").
			Order("comments.created_at asc").
			Select("comments.*, users.name as user_name, users.avatar as user_avatar, tmp_like.like, tmp_like.dislike, tmp_like.user_like_state").
			Scopes(commentLikeScope).
			Where("parent_id = ?", c.ID).
			Find(&replies).Error
		if err != nil {
			return nil, err
		}
		res.Comments[i].Replies = replies
	}

	return &res, nil
}

func (d *Discussion) GetByRagIDs(ctx context.Context, res any, ids []string) error {
	return d.base.model(ctx).Where("rag_id in (?)", ids).Find(res).Error
}

func (d *Discussion) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return d.base.model(ctx).
		Joins("left join users on users.id = discussions.user_id").
		Select("discussions.*, users.name as user_name, users.avatar as user_avatar").
		Scopes(o.Scopes()...).
		Find(res).Error
}
