package repo

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
	"gorm.io/gorm"
)

type UserPointRecord struct {
	base[*model.UserPointRecord]
}

func (u *UserPointRecord) updateUserPoint(tx *gorm.DB, record *model.UserPointRecord) error {
	if record.Point > 0 && record.RevokeID == 0 {
		var todayPoints int
		err := tx.Model(&model.UserPointRecord{}).Select("COALESCE(SUM(point),0)").Where("user_id = ? AND point > 0 AND revoke_id = 0 AND created_at >= ?", record.UserID, util.DayTrunc(time.Now())).Scan(&todayPoints).Error
		if err != nil {
			return err
		}

		if 100-todayPoints <= 0 {
			// 当前最多只能 +100 积分
			return nil
		}

		record.Point = min(record.Point, 100-todayPoints)
	}

	var user model.User
	err := tx.Model(&model.User{}).Where("id = ?", record.UserID).First(&user).Error
	if err != nil {
		return err
	}

	point := max(1, int(user.Point)+record.Point)

	record.Point = point - int(user.Point)

	err = tx.Create(record).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.User{}).Where("id = ?", record.UserID).UpdateColumn("point", point).Error
	if err != nil {
		return err
	}

	return nil
}

func (u *UserPointRecord) CreateRecord(ctx context.Context, record model.UserPointRecordInfo, revoke bool, fromUserID uint) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if revoke {
			var lastRecord model.UserPointRecord
			err := tx.Model(&model.UserPointRecord{}).Where("user_id = ? AND type = ? AND foreign_id = ?", record.UserID, record.Type, record.ForeignID).Order("created_at DESC").First(&lastRecord).Error
			if err != nil {
				return err
			}

			if lastRecord.RevokeID > 0 {
				return nil
			}

			return u.updateUserPoint(tx, &model.UserPointRecord{
				UserPointRecordInfo: record,
				Point:               -lastRecord.Point,
				RevokeID:            lastRecord.ID,
			})
		}

		switch record.Type {
		case model.UserPointTypeUserAvatar, model.UserPointTypeUserIntro, model.UserPointTypeUserRole:
			exist, err := u.Exist(ctx, QueryWithEqual("type", record.Type), QueryWithEqual("user_id", record.UserID))
			if err != nil {
				return err
			}

			if exist {
				return nil
			}
		}

		point := model.UserPointTypePointM[record.Type]
		if fromUserID == record.UserID {
			point = 0
		}

		return u.updateUserPoint(tx, &model.UserPointRecord{
			UserPointRecordInfo: record,
			Point:               point,
			RevokeID:            0,
		})
	})
}

func (u *UserPointRecord) UserPoints(ctx context.Context, queryFuncs ...QueryOptFunc) (res []model.UserPointItem, err error) {
	o := getQueryOpt(queryFuncs...)
	err = u.model(ctx).Select("user_id, SUM(point) AS point").
		Scopes(o.Scopes()...).
		Group("user_id").Order("point DESC").Find(&res).Error
	return
}

func newUserPointRecord(db *database.DB) *UserPointRecord {
	return &UserPointRecord{base: base[*model.UserPointRecord]{db: db, m: &model.UserPointRecord{}}}
}

func init() {
	register(newUserPointRecord)
}
