package repo

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type Org struct {
	base[*model.Org]
}

func (o *Org) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	quertOpt := getQueryOpt(queryFuncs...)

	return o.model(ctx).
		Select([]string{
			"orgs.*",
			"org_user.count",
			"(SELECT ARRAY_AGG(forums.name) FROM forums WHERE forums.id = ANY(orgs.forum_ids)) AS forum_names",
		}).
		Joins("LEFT JOIN (SELECT org_id, COUNT(*) AS count FROM (SELECT id, UNNEST(org_ids) AS org_id FROM users where invisible = false) AS unnest_user GROUP BY org_id) AS org_user ON org_user.org_id = orgs.id").
		Scopes(quertOpt.Scopes()...).
		Find(res).Error
}

func (o *Org) GetBuiltin(ctx context.Context) (*model.Org, error) {
	var org model.Org
	err := o.model(ctx).Where("builtin = ?", true).First(&org).Error
	if err != nil {
		return nil, err
	}

	return &org, nil
}

func (o *Org) ListForumIDs(ctx context.Context, orgIDs ...int64) (model.Int64Array, error) {
	var forumIDs []int64
	err := o.model(ctx).
		Select("DISTINCT(UNNEST(forum_ids))").
		Scopes(func(d *gorm.DB) *gorm.DB {
			if len(orgIDs) == 0 {
				return d
			}

			return d.Where("id = ANY(?)", model.Int64Array(orgIDs))
		}).
		Scan(&forumIDs).Error
	if err != nil {
		return nil, err
	}

	return model.Int64Array(forumIDs), nil
}

func (o *Org) Delete(ctx context.Context, orgID uint) error {
	err := o.db.WithContext(ctx).Model(&model.User{}).
		Where("? =ANY(org_ids)", orgID).Updates(map[string]any{
		"org_ids":    gorm.Expr("ARRAY_REMOVE(org_ids, ?)", orgID),
		"updated_at": time.Now(),
	}).Error
	if err != nil {
		return err
	}

	err = o.model(ctx).Where("id = ?", orgID).Delete(nil).Error
	if err != nil {
		return err
	}

	return nil
}

func newOrg(db *database.DB) *Org {
	return &Org{
		base: base[*model.Org]{
			m: &model.Org{}, db: db,
		},
	}
}

func init() {
	register(newOrg)
}
