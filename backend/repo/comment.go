package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type Comment struct {
	base[*model.Comment]
}

func newComment(db *database.DB) *Comment {
	return &Comment{base: base[*model.Comment]{db: db, m: &model.Comment{}}}
}

func (c *Comment) Create(ctx context.Context, discType model.DiscussionType, comment *model.Comment) error {
	return c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if comment.ParentID == 0 && discType == model.DiscussionTypeQA {
			err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, comment.UserID).Error
			if err != nil {
				return err
			}

			var exist bool
			err = tx.Raw("SELECT EXISTS (?)", tx.Model(c.m).
				Where("discussion_id = ? AND user_id = ? AND parent_id = ?", comment.DiscussionID, comment.UserID, 0),
			).Scan(&exist).Error
			if err != nil {
				return err
			}

			if exist {
				return errors.New("user can only have one answer")
			}
		}

		return tx.Model(c.m).Create(comment).Error
	})
}

func (c *Comment) Detail(ctx context.Context, id uint) (*model.CommentDetail, error) {
	var res model.CommentDetail
	if err := c.model(ctx).Where("comments.id = ?", id).
		Joins("left join users on users.id = comments.user_id").
		Select("comments.*, users.name as user_name").
		First(&res).Error; err != nil {
		return nil, err
	}
	return &res, nil
}

func (c *Comment) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return c.model(ctx).
		Joins("left join users on users.id = comments.user_id").
		Select("comments.*, users.name as user_name").
		Scopes(o.Scopes()...).
		Find(res).Error
}

func (c *Comment) ListFirstHuman(ctx context.Context, discIDs model.Int64Array) (res []model.Base, err error) {
	err = c.model(ctx).
		Select("discussion_id as id, MIN(created_at) AS created_at, MIN(updated_at) AS updated_at").
		Where("discussion_id =ANY(?)", discIDs).
		Where("bot = ?", false).
		Group("discussion_id").Find(&res).Error
	return
}

func (c *Comment) CountByForumIDs(ctx context.Context, res *int64, forumIDs model.Int64Array, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)
	return c.model(ctx).
		Where("discussion_id IN (SELECT id FROM discussions WHERE forum_id = ANY(?))", forumIDs).
		Scopes(o.Scopes()...).
		Count(res).Error
}

func (c *Comment) CountDiscussion(ctx context.Context, res *int64, begin time.Time, queryFuncs ...QueryOptFunc) error {
	o := getQueryOpt(queryFuncs...)

	return c.model(ctx).Scopes(o.Scopes()...).
		Where("discussion_id IN (SELECT id FROM discussions where created_at >= ?)", begin).
		Count(res).Error
}

func init() {
	register(newComment)
}
