package repo

import (
	"context"
	"encoding/json"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type System struct {
	base[*model.System[any]]
}

func (s *System) GetValueByKey(ctx context.Context, res any, key string) error {
	var data struct {
		Value []byte
	}

	err := s.model(ctx).Where("key = ?", key).First(&data).Error
	if err != nil {
		return err
	}

	return json.Unmarshal(data.Value, res)
}

func (s *System) Create(ctx context.Context, data *model.System[any]) error {
	return s.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
	}).Create(data).Error
}

func newSystem(db *database.DB) *System {
	return &System{
		base: base[*model.System[any]]{
			db: db, m: &model.System[any]{},
		},
	}
}

func init() {
	register(newSystem)
}
