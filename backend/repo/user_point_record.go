package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
	"gorm.io/gorm"
)

type UserPointRecord struct {
	base[*model.UserPointRecord]
}

func (u *UserPointRecord) updateUserPoint(tx *gorm.DB, record *model.UserPointRecord, todayAddPoint, addPoint *int) error {
	if record.Point > 0 && record.RevokeID == 0 {
		var todayPoints int
		err := tx.Model(&model.UserPointRecord{}).Select("COALESCE(SUM(point),0)").Where("user_id = ? AND point > 0 AND revoke_id = 0 AND created_at >= ?", record.UserID, util.DayTrunc(time.Now())).Scan(&todayPoints).Error
		if err != nil {
			return err
		}

		if todayAddPoint != nil {
			*todayAddPoint = todayPoints
		}

		if 100-todayPoints <= 0 {
			// 当前最多只能 +100 积分
			return nil
		}

		record.Point = min(record.Point, 100-todayPoints)

		if addPoint != nil {
			*addPoint = record.Point
		}

	} else if record.Point < 0 {
		var user model.User
		err := tx.Model(&model.User{}).Where("id = ?", record.UserID).First(&user).Error
		if err != nil {
			return err
		}

		record.Point = max(1, int(user.Point)+record.Point) - int(user.Point)
	}

	if record.Point == 0 && record.RevokeID == 0 {
		return nil
	}

	err := tx.Create(record).Error
	if err != nil {
		return err
	}

	err = tx.Model(&model.User{}).Where("id = ?", record.UserID).UpdateColumn("point", gorm.Expr("point+?", record.Point)).Error
	if err != nil {
		return err
	}

	return nil
}

func (u *UserPointRecord) skipCreate(ctx context.Context, record model.UserPointRecordInfo) (bool, error) {
	if _, ok := model.UserPointTypePointM[record.Type]; !ok {
		return true, nil
	}

	switch record.Type {
	case model.UserPointTypeUserAvatar, model.UserPointTypeUserIntro, model.UserPointTypeUserRole:
		exist, err := u.Exist(ctx, QueryWithEqual("type", record.Type), QueryWithEqual("user_id", record.UserID))
		if err != nil {
			return false, err
		}

		if exist {
			return true, nil
		}
	case model.UserPointTypeCreateBlog:
		return false, nil
	case model.UserPointTypeAcceptAnswer:
		return record.FromID != record.UserID, nil
	}

	return record.FromID == record.UserID, nil
}

func (u *UserPointRecord) CreateRecord(ctx context.Context, record model.UserPointRecordInfo, revoke bool, todayAddPoint, addPoint *int) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if revoke {
			var lastRecord model.UserPointRecord
			err := tx.Model(&model.UserPointRecord{}).Where("user_id = ? AND type = ? AND foreign_id = ? AND from_id = ?", record.UserID, record.Type, record.ForeignID, record.FromID).Order("created_at DESC").First(&lastRecord).Error
			if err != nil {
				if errors.Is(err, database.ErrRecordNotFound) {
					return nil
				}
				return err
			}

			if lastRecord.RevokeID > 0 {
				return nil
			}

			return u.updateUserPoint(tx, &model.UserPointRecord{
				UserPointRecordInfo: record,
				Point:               -lastRecord.Point,
				RevokeID:            lastRecord.ID,
			}, todayAddPoint, addPoint)
		}

		skip, err := u.skipCreate(ctx, record)
		if err != nil {
			return err
		}
		if skip {
			return nil
		}

		return u.updateUserPoint(tx, &model.UserPointRecord{
			UserPointRecordInfo: record,
			Point:               model.UserPointTypePointM[record.Type],
			RevokeID:            0,
		}, todayAddPoint, addPoint)
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
