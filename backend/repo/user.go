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
	"gorm.io/gorm/clause"
)

type User struct {
	base[*model.User]

	oc     oss.Client
	org    *Org
	logger *glog.Logger
}

func (u *User) ListWithOrg(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	queryOpt := getQueryOpt(queryFuncs...)
	return u.model(ctx).Select("users.*, (SELECT ARRAY_AGG(orgs.name) FROM orgs WHERE orgs.id =ANY(users.org_ids)) AS org_names").
		Scopes(queryOpt.Scopes()...).Find(res).Error
}

func (u *User) HasForumPermission(ctx context.Context, userID, forumID uint) (bool, error) {
	if userID == 0 {
		org, err := u.org.GetDefaultOrg(ctx)
		if err != nil {
			return false, err
		}

		return slices.Contains(org.ForumIDs, int64(forumID)), nil
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

func (u *User) CreateThird(ctx context.Context, orgID uint, user *third_auth.User, enableRegister bool) (*model.User, error) {
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

			if !enableRegister && user.Type == model.AuthTypeWechat {
				return errors.New("register is disabled")
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
				WebNotify: true,
			}
			txErr = u.createUser(tx, &dbUser)
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

func (u *User) createUser(tx *gorm.DB, user *model.User) error {
	user.Point = 0

	err := tx.Model(u.m).Create(user).Error
	if err != nil {
		return err
	}

	records := make([]model.UserPointRecord, 0, 3)
	point := 0

	if user.Role != model.UserRoleGuest {
		point += 1
		records = append(records, model.UserPointRecord{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID: user.ID,
				Type:   model.UserPointTypeUserRole,
			},
			Point: 1,
		})
	}

	if user.Avatar != "" {
		point += 5
		records = append(records, model.UserPointRecord{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID: user.ID,
				Type:   model.UserPointTypeUserAvatar,
			},
			Point: 5,
		})
	}

	if user.Intro != "" {
		point += 5
		records = append(records, model.UserPointRecord{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID: user.ID,
				Type:   model.UserPointTypeUserIntro,
			},
			Point: 5,
		})
	}

	err = tx.CreateInBatches(&records, 4).Error
	if err != nil {
		return err
	}

	return tx.Model(u.m).Where("id = ?", user.ID).UpdateColumn("point", point).Error
}

func (u *User) Create(ctx context.Context, user *model.User) error {
	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return u.createUser(tx, user)
	})
}

func (u *User) CreateSearchHistory(ctx context.Context, searchHistory *model.UserSearchHistory) error {
	return u.db.WithContext(ctx).Create(searchHistory).Error
}

func (u *User) ListSearchHistory(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)
	return u.db.Model(&model.UserSearchHistory{}).
		Scopes(opt.Scopes()...).
		Find(res).Error
}

func (u *User) CountSearchHistory(ctx context.Context, cnt *int64, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)
	return u.db.Model(&model.UserSearchHistory{}).
		Scopes(opt.Scopes()...).
		Count(cnt).Error
}

func (u *User) NotifySubBatchProcess(ctx context.Context, batchSize int, processFn func([]model.UserNotiySub) error, queryFuncs ...QueryOptFunc) error {
	if batchSize <= 0 {
		batchSize = 100
	}

	o := getQueryOpt(queryFuncs...)
	var results []model.UserNotiySub

	return u.db.WithContext(ctx).Model(&model.UserNotiySub{}).Scopes(o.Scopes()...).FindInBatches(&results, batchSize, func(tx *gorm.DB, batch int) error {
		return processFn(results)
	}).Error
}

func (u *User) ListNotifySub(ctx context.Context, queryFuncs ...QueryOptFunc) (res []model.UserNotiySub, err error) {
	opt := getQueryOpt(queryFuncs...)
	err = u.db.WithContext(ctx).Model(&model.UserNotiySub{}).Scopes(opt.Scopes()...).Find(&res).Error
	return
}

func (u *User) BindNotifySub(ctx context.Context, userSub *model.UserNotiySub) error {
	return u.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "type"}, {Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"third_id", "updated_at"}),
		}).
		Create(userSub).Error
}

func (u *User) UnbindNotifySub(ctx context.Context, uid uint, typ model.MessageNotifySubType) error {
	return u.db.WithContext(ctx).Where("type = ? AND user_id = ?", typ, uid).Delete(nil).Error
}

func newUser(db *database.DB, org *Org, oc oss.Client) *User {
	return &User{
		base: base[*model.User]{
			db: db, m: &model.User{},
		},
		org:    org,
		oc:     oc,
		logger: glog.Module("repo", "user"),
	}
}

func init() {
	register(newUser)
}
