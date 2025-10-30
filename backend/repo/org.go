package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type Org struct {
	base[*model.Org]
}

func (o *Org) List(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	quertOpt := getQueryOpt(queryFuncs...)

	return o.model(ctx).Joins("LEFT JOIN (SELECT org_id, COUNT(*) AS count FROM users GROUP BY org_id) AS org_user ON org_user.org_id = orgs.id").
		Scopes(quertOpt.Scopes()...).
		Find(&res).Error
}

func (o *Org) Create(ctx context.Context, org *model.Org) error {
	return o.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name"}),
	}).Create(org).Error
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
