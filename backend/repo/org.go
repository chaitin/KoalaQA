package repo

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
		Joins("LEFT JOIN (SELECT org_id, COUNT(*) AS count FROM users GROUP BY org_id) AS org_user ON org_user.org_id = orgs.id").
		Scopes(quertOpt.Scopes()...).
		Find(&res).Error
}

func (o *Org) ListForumIDs(ctx context.Context, orgIDs ...int64) (model.Int64Array, error) {
	if len(orgIDs) == 0 {
		return model.Int64Array{}, nil
	}

	var forumIDs []int64
	err := o.model(ctx).
		Select("DISTINCT(UNNEST(forum_ids))").
		Where("id = ANY(?)", model.Int64Array(orgIDs)).Scan(&forumIDs).Error
	if err != nil {
		return nil, err
	}

	return model.Int64Array(forumIDs), nil
}

func (o *Org) Create(ctx context.Context, org *model.Org) error {
	return o.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "forum_ids"}),
	}).Create(org).Error
}

func (o *Org) Delete(ctx context.Context, orgID uint) error {
	err := o.db.WithContext(ctx).Model(&model.User{}).
		Where("? =ANY(org_ids)", orgID).Updates(map[string]any{
		"org_ids":    gorm.Expr("ARRAY_REMOVE(?)", orgID),
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
