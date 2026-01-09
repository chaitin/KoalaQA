package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MessageNotifySub struct {
	base[*model.MessageNotifySub]
}

func (m *MessageNotifySub) Upsert(ctx context.Context, data *model.MessageNotifySub) error {
	return m.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var sub model.MessageNotifySub
		err := tx.Model(&model.MessageNotifySub{}).Where("type = ?", data.Type).First(&sub).Error
		if err != nil {
			return err
		}

		if !sub.Info.Inner().Equal(data.Info.Inner()) {
			err = tx.Model(&model.UserNotiySub{}).Where("type = ?", data.Type).Delete(nil).Error
			if err != nil {
				return err
			}
		}

		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "type"}},
			DoUpdates: clause.AssignmentColumns([]string{"enabled", "info", "updated_at"}),
		}).Create(data).Error
	})
}

func (m *MessageNotifySub) GetByType(ctx context.Context, t model.MessageNotifySubType) (*model.MessageNotifySub, error) {
	var res model.MessageNotifySub
	err := m.model(ctx).Where("type = ?", t).First(&res).Error
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func newMessageNotifySub(db *database.DB) *MessageNotifySub {
	return &MessageNotifySub{
		base: base[*model.MessageNotifySub]{
			db: db, m: &model.MessageNotifySub{},
		},
	}
}

func init() {
	register(newMessageNotifySub)
}
