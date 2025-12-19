package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type Version struct {
	base[*model.Version]
}

func (v *Version) Create(ctx context.Context, ver *model.Version) error {
	return v.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "version"}},
		DoNothing: true,
	}).Create(ver).Error
}

func (v *Version) FirstInstall(ctx context.Context) (bool, error) {
	exist, err := v.Exist(ctx)
	if err != nil {
		return false, err
	}

	return !exist, nil
}

func newVersion(db *database.DB) *Version {
	return &Version{base: base[*model.Version]{db: db, m: &model.Version{}}}
}

func init() {
	register(newVersion)
}
