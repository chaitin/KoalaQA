package repo

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserQuickReply struct {
	base[*model.UserQuickReply]
}

func (u *UserQuickReply) Create(ctx context.Context, m *model.UserQuickReply) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, m.UserID).Error
		if err != nil {
			return err
		}

		var count int64
		err = tx.Model(u.m).Where("user_id = ?", m.UserID).Count(&count).Error
		if err != nil {
			return err
		}

		if count > 4 {
			return errors.New("quick reply num limit")
		}

		m.Index = uint(count) + 1

		err = tx.Model(u.m).Create(m).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func (u *UserQuickReply) DeleteByID(ctx context.Context, id, userID uint) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, userID).Error
		if err != nil {
			return err
		}

		var qr model.UserQuickReply
		err = tx.Model(u.m).Where("id = ? AND user_id = ?", id, userID).First(&qr).Error
		if err != nil {
			return err
		}

		err = tx.Model(u.m).Where("id = ?", id).Delete(nil).Error
		if err != nil {
			return err
		}

		err = tx.Model(u.m).Where("user_id = ? AND index > ?", userID, qr.Index).UpdateColumn("index", gorm.Expr("index - 1")).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func (u *UserQuickReply) Reindex(ctx context.Context, userID uint, ids []uint) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, userID).Error
		if err != nil {
			return err
		}

		idIndex := make(map[uint]uint)
		var curIndex uint = 1
		for _, id := range ids {
			if _, ok := idIndex[id]; ok {
				continue
			}
			idIndex[id] = curIndex
			curIndex++
		}

		var qrs []model.UserQuickReply
		err = tx.Model(u.m).Where("user_id = ?", userID).Find(&qrs).Error
		if err != nil {
			return err
		}

		if len(qrs) != len(idIndex) {
			return errors.New("invalid request")
		}

		for i := range qrs {
			index, ok := idIndex[qrs[i].ID]
			if !ok {
				return errors.New("invalid request")
			}

			qrs[i].Index = uint(index)
		}

		err = tx.Model(u.m).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"index", "updated_at"}),
		}).Create(&qrs).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func newUserQuickReply(db *database.DB) *UserQuickReply {
	return &UserQuickReply{
		base: base[*model.UserQuickReply]{
			db: db, m: &model.UserQuickReply{},
		},
	}
}

func init() {
	register(newUserQuickReply)
}
