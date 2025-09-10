package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"gorm.io/gorm"
)

type User struct {
	base[*model.User]
}

func (u *User) GetByEmail(ctx context.Context, res any, email string) error {
	return u.model(ctx).Where("email = ?", email).First(&res).Error
}

func (u *User) CreateThird(ctx context.Context, user *third_auth.User) (uint, error) {
	var userID uint = 0
	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, user.HashUint()).Error
		if err != nil {
			return err
		}

		var userThird model.UserThird
		txErr := tx.Model(&model.UserThird{}).Where("third_id = ? AND type = ?", user.ThirdID, user.Type).
			First(&userThird).Error
		if txErr != nil && !errors.Is(txErr, gorm.ErrRecordNotFound) {
			return txErr
		} else if txErr == nil {
			txErr = tx.Model(u.m).Where("id = ?", userThird.UserID).Updates(map[string]any{
				"updated_at": time.Now(),
				"last_login": time.Now(),
			}).Error
			if txErr != nil {
				return txErr
			}
			return nil
		}

		dbUser := model.User{
			Name:      user.Name,
			Email:     user.Email,
			Builtin:   false,
			Role:      user.Role,
			Invisible: false,
			LastLogin: model.Timestamp(time.Now().Unix()),
		}
		txErr = tx.Model(&model.User{}).Create(&dbUser).Error
		if txErr != nil {
			return txErr
		}

		userThird = model.UserThird{
			UserID:  dbUser.ID,
			ThirdID: user.ThirdID,
			Type:    user.Type,
		}

		txErr = tx.Model(&model.UserThird{}).Create(&userThird).Error
		if txErr != nil {
			return txErr
		}

		userID = dbUser.ID
		return nil
	})
	if err != nil {
		return 0, err
	}

	return userID, nil
}

func newUser(db *database.DB) *User {
	return &User{
		base: base[*model.User]{
			db: db, m: &model.User{},
		},
	}
}

func init() {
	register(newUser)
}
