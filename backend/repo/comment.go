package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Comment struct {
	base[*model.Comment]
}

func newComment(db *database.DB) *Comment {
	return &Comment{base: base[*model.Comment]{db: db}}
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

func init() {
	register(newComment)
}
