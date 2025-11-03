package repo

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	base[*model.User]
}

func (u *User) ListWithOrg(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	queryOpt := getQueryOpt(queryFuncs...)
	return u.model(ctx).Select("users.*, (SELECT ARRAY_AGG(orgs.name) FROM orgs WHERE orgs.id =ANY(users.org_ids)) AS org_names").
		Scopes(queryOpt.Scopes()...).Find(res).Error
}

func (u *User) HasForumPermission(ctx context.Context, userID, forumID uint) (bool, error) {
	var exist bool
	err := u.model(ctx).Raw("SELECT EXISTS (?)", u.model(ctx).Where("id = ?", userID).
		Where("org_ids && (SELECT ARRAY_AGG(id) FROM orgs WHERE ? =ANY(forum_ids))", forumID)).
		Scan(&exist).Error
	if err != nil {
		return false, err
	}

	return exist, nil
}

func (u *User) GetByEmail(ctx context.Context, res any, email string) error {
	return u.model(ctx).Where("email = ?", email).First(res).Error
}

func (u *User) CreateThird(ctx context.Context, orgID uint, user *third_auth.User) (*model.User, error) {
	if user.ThirdID == "" {
		return nil, errors.New("empty user third_id")
	}
	if orgID == 0 {
		return nil, errors.New("invalid org_id")
	}

	var dbUser model.User
	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txErr := tx.Exec(`SELECT pg_advisory_xact_lock(?)`, user.HashInt()).Error
		if txErr != nil {
			return txErr
		}

		var userThird model.UserThird
		txErr = tx.Model(&model.UserThird{}).Where("third_id = ? AND type = ?", user.ThirdID, user.Type).
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

			txErr = tx.Model(u.m).Where("id = ?", userThird.UserID).First(&dbUser).Error
			if txErr != nil {
				return nil
			}

			return nil
		}

		createUser := user.Email == ""
		if !createUser {
			txErr = tx.Model(&model.User{}).Where("email = ?", user.Email).First(&dbUser).Error
			if txErr != nil {
				if !errors.Is(txErr, database.ErrRecordNotFound) {
					return txErr
				}

				createUser = true
			}
		}

		if createUser {
			dbUser = model.User{
				Name:      user.Name,
				Email:     user.Email,
				Builtin:   false,
				Role:      user.Role,
				Invisible: false,
				LastLogin: model.Timestamp(time.Now().Unix()),
				Key:       uuid.NewString(),
				OrgIDs:    model.Int64Array{int64(orgID)},
			}
			txErr = tx.Model(&model.User{}).Create(&dbUser).Error
			if txErr != nil {
				return txErr
			}
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

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &dbUser, nil
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
