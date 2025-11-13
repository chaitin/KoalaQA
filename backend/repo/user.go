package repo

import (
	"bytes"
	"context"
	"errors"
	"mime"
	"slices"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	base[*model.User]

	system *System
	oc     oss.Client
	logger *glog.Logger
}

func (u *User) ListWithOrg(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	queryOpt := getQueryOpt(queryFuncs...)
	return u.model(ctx).Select("users.*, (SELECT ARRAY_AGG(orgs.name) FROM orgs WHERE orgs.id =ANY(users.org_ids)) AS org_names").
		Scopes(queryOpt.Scopes()...).Find(res).Error
}

func (u *User) HasForumPermission(ctx context.Context, userID, forumID uint) (bool, error) {
	if userID == 0 {
		var auth model.Auth
		err := u.system.GetValueByKey(ctx, &auth, model.SystemKeyAuth)
		if err != nil {
			return false, err
		}

		return slices.Contains(auth.PublicForumIDs, forumID), nil
	}
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

func (u *User) DeleteByID(ctx context.Context, userID uint) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(&model.User{}).Where("id = ?", userID).Delete(nil).Error
		if err != nil {
			return err
		}

		err = tx.Model(&model.UserThird{}).Where("user_id = ?", userID).Delete(nil).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func (u *User) getAvatarFromURL(ctx context.Context, imgURL string) string {
	if imgURL == "" {
		return ""
	}

	logger := u.logger.WithContext(ctx).With("avatar_url", imgURL)
	imgData, contentType, err := util.HTTPGetWithContentType(imgURL)
	if err != nil {
		logger.WithErr(err).Warn("download img failed")
		return ""
	}

	logger = logger.With("content_type", contentType)

	ext := ""

	if contentType != "application/octet-stream" {
		exts, err := mime.ExtensionsByType(contentType)
		if err != nil {
			logger.WithErr(err).Warn("get ext from content_type failed")
			return ""
		}

		if len(exts) > 0 {
			ext = exts[len(exts)-1]
		}
	}

	avatar, err := u.oc.Upload(ctx, "avatar", bytes.NewReader(imgData),
		oss.WithLimitSize(),
		oss.WithFileSize(len(imgData)),
		oss.WithExt(ext),
		oss.WithPublic(),
	)
	if err != nil {
		logger.WithErr(err).Warn("upload avatar to oss failed")
		return ""
	}

	return avatar
}

func (u *User) CreateThird(ctx context.Context, orgID uint, user *third_auth.User, canRegister bool) (*model.User, error) {
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
		if txErr != nil {
			if !errors.Is(txErr, gorm.ErrRecordNotFound) {
				return txErr
			}

			if !canRegister {
				return errors.New("user can not register")
			}
		} else {
			txErr = tx.Model(u.m).Where("id = ?", userThird.UserID).Updates(map[string]any{
				"updated_at": time.Now(),
				"last_login": time.Now(),
			}).Error
			if txErr != nil {
				return txErr
			}

			txErr = tx.Model(u.m).Where("id = ?", userThird.UserID).First(&dbUser).Error
			if txErr != nil {
				if !errors.Is(txErr, database.ErrRecordNotFound) {
					return txErr
				}

				txErr = tx.Model(&model.UserThird{}).Where("id = ?", userThird.ID).Delete(nil).Error
				if txErr != nil {
					return txErr
				}
			} else {
				return nil
			}
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
			user.Avatar = u.getAvatarFromURL(ctx, user.Avatar)

			dbUser = model.User{
				Name:      user.Name,
				Email:     user.Email,
				Builtin:   false,
				Role:      user.Role,
				Invisible: false,
				Avatar:    user.Avatar,
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

func newUser(db *database.DB, system *System, oc oss.Client) *User {
	return &User{
		base: base[*model.User]{
			db: db, m: &model.User{},
		},
		system: system,
		oc:     oc,
		logger: glog.Module("repo", "user"),
	}
}

func init() {
	register(newUser)
}
