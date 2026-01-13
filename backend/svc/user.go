package svc

import (
	"context"
	"encoding/base64"
	"errors"
	"mime/multipart"
	"path/filepath"
	"slices"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	jwt            *jwt.Generator
	repoUser       *repo.User
	repoNotifySub  *repo.MessageNotifySub
	repoDisc       *repo.Discussion
	repoUserPoint  *repo.UserPointRecord
	repoComment    *repo.Comment
	authMgmt       *third_auth.Manager
	svcAuth        *Auth
	svcPublicAddr  *PublicAddress
	oc             oss.Client
	repoOrg        *repo.Org
	repoUserReview *repo.UserReview
	pub            mq.Publisher
	logger         *glog.Logger
}

type UserListReq struct {
	model.Pagination

	OrgID   *uint           `form:"org_id"`
	OrgName *string         `form:"org_name"`
	Name    *string         `form:"name"`
	Email   *string         `form:"email"`
	Role    *model.UserRole `form:"role"`
}

type UserListItem struct {
	model.Base

	OrgIDs    model.Int64Array  `json:"org_ids" gorm:"type:bigint[]"`
	OrgNames  model.StringArray `json:"org_names" gorm:"type:text[]"`
	Name      string            `json:"name"`
	Role      model.UserRole    `json:"role"`
	Avatar    string            `json:"avatar"`
	Builtin   bool              `json:"builtin"`
	Email     string            `json:"email"`
	LastLogin model.Timestamp   `json:"last_login"`
	Key       string            `json:"-"`
}

func (u *User) List(ctx context.Context, req UserListReq) (*model.ListRes[UserListItem], error) {
	var res model.ListRes[UserListItem]
	err := u.repoUser.ListWithOrg(ctx, &res.Items,
		repo.QueryWithPagination(&req.Pagination),
		repo.QueryWithOrderBy("created_at DESC,id DESC"),
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
		repo.QueryWithEqual("org_ids", req.OrgID, repo.EqualOPValIn),
		repo.QueryWithILike("email", req.Email),
		repo.QueryWithEqual("role", req.Role),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoUser.Count(ctx, &res.Total,
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
		repo.QueryWithEqual("org_ids", req.OrgID, repo.EqualOPValIn),
		repo.QueryWithILike("email", req.Email),
		repo.QueryWithEqual("role", req.Role),
	)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

type UserCreateReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (u *User) Detail(ctx context.Context, id uint) (*model.User, error) {
	var item model.User
	err := u.repoUser.GetByID(ctx, &item, id)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (u *User) ForumIDs(ctx context.Context, id uint) (model.Int64Array, error) {
	if id == 0 {
		org, err := u.repoOrg.GetDefaultOrg(ctx)
		if err != nil {
			return nil, err
		}

		return org.ForumIDs, nil
	}

	user, err := u.Detail(ctx, id)
	if err != nil {
		return nil, err
	}

	return u.repoOrg.ListForumIDs(ctx, user.OrgIDs...)
}

func (u *User) Admin(ctx context.Context) (*model.User, error) {
	var dbUser model.User
	err := u.repoUser.GetAdmin(ctx, &dbUser)
	if err != nil {
		return nil, err
	}

	return &dbUser, nil
}

type UserUpdateReq struct {
	Name     string           `json:"name"`
	Email    string           `json:"email" binding:"omitempty,email"`
	Password string           `json:"password"`
	Role     model.UserRole   `json:"role" binding:"min=1,max=4"`
	OrgIDs   model.Int64Array `json:"org_ids"`
}

func (u *User) Update(ctx context.Context, opUserID uint, id uint, req UserUpdateReq) error {
	var user model.User
	err := u.repoUser.GetByID(ctx, &user, id)
	if err != nil {
		return err
	}

	updateM := map[string]any{
		"updated_at": time.Now(),
	}

	if user.Name != "" && req.Name != user.Name {
		updateM["name"] = req.Name
	}

	if req.Password != "" {
		hashPass, err := u.convertPassword(req.Password)
		if err != nil {
			return err
		}

		updateM["password"] = hashPass
	}
	if req.Email != "" && req.Email != user.Email {
		ok, err := u.repoUser.Exist(ctx, repo.QueryWithEqual("email", req.Email))
		if err != nil {
			return err
		}

		if ok {
			return errors.New("email already used")
		}

		updateM["email"] = req.Email
	}

	if !user.Builtin && req.Role != user.Role {
		updateM["role"] = req.Role

		if user.Role == model.UserRoleGuest {
			var review model.UserReview
			err := u.repoUserReview.Get(ctx, &review,
				repo.QueryWithEqual("user_id", user.ID),
				repo.QueryWithEqual("type", model.UserReviewTypeGuest),
				repo.QueryWithEqual("state", model.UserReviewStateReview),
			)
			if err != nil {
				if !errors.Is(err, database.ErrRecordNotFound) {
					return err
				}
			} else {
				err = u.repoUserReview.Update(ctx, map[string]any{
					"state":      model.UserReviewStatePass,
					"updated_at": time.Now(),
				}, repo.QueryWithEqual("id", review.ID))
				if err != nil {
					return err
				}

				u.pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
					UserReviewHeader: model.UserReviewHeader{
						ReviewID:    review.ID,
						ReviewType:  model.UserReviewTypeGuest,
						ReviewState: model.UserReviewStatePass,
					},
					Type:   model.MsgNotifyTypeUserReview,
					FromID: opUserID,
					ToID:   id,
				})

				err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
					UserPointRecordInfo: model.UserPointRecordInfo{
						UserID: id,
						Type:   model.UserPointTypeUserRole,
					},
				})
				if err != nil {
					return err
				}
			}

			// 更新用户角色，用于后续判断
			user.Role = req.Role
		}
	}

	if user.Role != model.UserRoleGuest && (!user.Builtin || user.Role != model.UserRoleAdmin) && len(req.OrgIDs) > 0 {
		err = u.repoOrg.FilterIDs(ctx, &req.OrgIDs)
		if err != nil {
			return err
		}

		adminOrg, err := u.repoOrg.GetAdminOrg(ctx)
		if err != nil {
			return err
		}

		if len(req.OrgIDs) > 0 && user.Builtin && user.Role == model.UserRoleAdmin && !slices.Contains(req.OrgIDs, int64(adminOrg.ID)) {
			req.OrgIDs = append(req.OrgIDs, int64(adminOrg.ID))
		}

		if len(req.OrgIDs) > 0 {
			updateM["org_ids"] = req.OrgIDs
		}
	}

	if len(updateM) == 1 {
		return nil
	}

	err = u.repoUser.Update(ctx, updateM, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}
	return nil
}

type UpdateWebNotifyReq struct {
	Emable bool `json:"enable"`
}

func (u *User) UpdateWebNotify(ctx context.Context, id uint, req UpdateWebNotifyReq) error {
	return u.repoUser.Update(ctx, map[string]any{
		"web_notify": req.Emable,
	}, repo.QueryWithEqual("id", id))
}

type UserUpdateInfoReq struct {
	Name        string                `form:"name"`
	Intro       *string               `form:"intro"`
	Email       string                `form:"email" binding:"omitempty,email"`
	OldPassword string                `form:"old_password"`
	Password    string                `form:"password"`
	Avatar      *multipart.FileHeader `form:"avatar" swaggerignore:"true"`
}

func (u *User) UpdateInfo(ctx context.Context, id uint, req UserUpdateInfoReq) error {
	var user model.User
	err := u.repoUser.GetByID(ctx, &user, id)
	if err != nil {
		return err
	}

	var avatarPath string
	if req.Avatar != nil {
		avatarF, err := req.Avatar.Open()
		if err != nil {
			return err
		}
		defer avatarF.Close()

		avatarPath, err = u.oc.Upload(ctx, "avatar", avatarF,
			oss.WithLimitSize(),
			oss.WithFileSize(int(req.Avatar.Size)),
			oss.WithExt(filepath.Ext(req.Avatar.Filename)),
			oss.WithPublic(),
		)
		if err != nil {
			return err
		}
	}

	updateM := map[string]any{
		"updated_at": time.Now(),
	}

	if req.Intro != nil && user.Intro != *req.Intro {
		updateM["intro"] = req.Intro
	}

	if user.Email == "" && req.Email != "" {
		exist, err := u.repoUser.Exist(ctx, repo.QueryWithEqual("email", req.Email))
		if err != nil {
			return err
		}

		if exist {
			return errors.New("email already used")
		}

		updateM["email"] = req.Email
	}

	if avatarPath != "" {
		updateM["avatar"] = avatarPath
	}

	if req.Name != "" {
		updateM["name"] = req.Name
	}

	// 内置用户不能修改密码，现在能登录的内置用户只有 admin
	if !user.Builtin && req.Password != "" {
		if user.Password != "" {
			if req.OldPassword == "" {
				return errors.New("empty old password")
			}

			err = u.checkPassword(req.OldPassword, user.Password)
			if err != nil {
				return err
			}
		}

		hashPass, err := u.convertPassword(req.Password)
		if err != nil {
			return err
		}

		updateM["password"] = hashPass
	}

	if len(updateM) == 1 {
		return nil
	}

	err = u.repoUser.Update(ctx, updateM, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	if avatarPath != "" {
		if user.Avatar != "" {
			err = u.oc.Delete(ctx, util.TrimFirstDir(user.Avatar))
			if err != nil {
				u.logger.WithContext(ctx).WithErr(err).With("avatar", user.Avatar).Warn("remove user avatar failed")
			}
		} else {
			err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
				UserPointRecordInfo: model.UserPointRecordInfo{
					UserID: user.ID,
					Type:   model.UserPointTypeUserAvatar,
				},
			})
			if err != nil {
				return err
			}
		}
	}

	if user.Intro == "" && req.Intro != nil && *req.Intro != "" {
		err = u.pub.Publish(ctx, topic.TopicUserPoint, topic.MsgUserPoint{
			UserPointRecordInfo: model.UserPointRecordInfo{
				UserID: user.ID,
				Type:   model.UserPointTypeUserIntro,
			},
		})
		if err != nil {
			return err
		}
	}

	return nil
}

type UserJoinOrgReq struct {
	UserIDs model.Int64Array `json:"user_ids" binding:"min=1"`
	OrgIDs  model.Int64Array `json:"org_ids" binding:"min=1"`
}

func (u *User) JoinOrg(ctx context.Context, req UserJoinOrgReq) error {
	err := u.repoOrg.FilterIDs(ctx, &req.OrgIDs)
	if err != nil {
		return err
	}

	if len(req.OrgIDs) == 0 {
		return errors.New("must choose 1 org")
	}

	err = u.repoUser.Update(ctx, map[string]any{
		"org_ids":    req.OrgIDs,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", req.UserIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("role", model.UserRoleGuest, repo.EqualOPNE))
	if err != nil {
		return err
	}

	return nil
}

func (u *User) Delete(ctx context.Context, id uint) error {
	var user model.User
	err := u.repoUser.GetByID(ctx, &user, id)
	if err != nil {
		return err
	}

	if user.Builtin {
		return errors.New("内置用户无法删除")
	}

	err = u.repoUser.DeleteByID(ctx, id)
	if err != nil {
		return err
	}

	return nil
}

type UserRegisterReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

var aesKey = []byte("vzWE2R9GckGefVFd")

func (u *User) decryptReqPassword(password string) ([]byte, error) {
	pwd, err := base64.StdEncoding.DecodeString(password)
	if err != nil {
		return nil, err
	}
	return util.AESDecrypt(pwd, aesKey)
}

func (u *User) checkPassword(password, hashPassword string) error {
	decryptPass, err := u.decryptReqPassword(password)
	if err != nil {
		return err
	}

	return bcrypt.CompareHashAndPassword([]byte(hashPassword), decryptPass)
}

func (u *User) convertPassword(password string) (string, error) {
	decryptPass, err := u.decryptReqPassword(password)
	if err != nil {
		return "å", err
	}

	hashPass, err := bcrypt.GenerateFromPassword(decryptPass, bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashPass), nil
}

func (u *User) Register(ctx context.Context, req UserRegisterReq) error {
	auth, err := u.svcAuth.Get(ctx)
	if err != nil {
		return err
	}

	if !auth.EnableRegister {
		return errors.New("register disabled")
	}

	hashPass, err := u.convertPassword(req.Password)
	if err != nil {
		return err
	}

	exist, err := u.repoUser.Exist(ctx, repo.QueryWithEqual("email", req.Email))
	if err != nil {
		return err
	}

	if exist {
		return errors.New("email already registered")
	}

	org, err := u.repoOrg.GetDefaultOrg(ctx)
	if err != nil {
		return err
	}

	user := model.User{
		Name:      req.Name,
		Email:     req.Email,
		Builtin:   false,
		Password:  hashPass,
		Role:      model.UserRoleUser,
		Key:       uuid.NewString(),
		OrgIDs:    model.Int64Array{int64(org.ID)},
		WebNotify: true,
	}

	if auth.NeedReview {
		user.Role = model.UserRoleGuest
	}

	err = u.repoUser.Create(ctx, &user)
	if err != nil {
		return err
	}

	return nil
}

type UserLoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (u *User) canAuth(ctx context.Context, t model.AuthType) (bool, error) {
	auth, err := u.svcAuth.Get(ctx)
	if err != nil {
		return false, err
	}

	return auth.CanAuth(t), nil
}

func (u *User) LoginMethod(ctx context.Context) (*AuthFrontendGetRes, error) {
	return u.svcAuth.FrontendGet(ctx)
}

func (u *User) Login(ctx context.Context, req UserLoginReq, cors bool) (string, error) {
	ok, err := u.canAuth(ctx, model.AuthTypePassword)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("password login disabled")
	}

	var user model.User
	err = u.repoUser.GetByEmail(ctx, &user, req.Email)
	if err != nil {
		return "", err
	}

	err = u.checkPassword(req.Password, user.Password)
	if err != nil {
		return "", err
	}

	token, err := u.jwt.Gen(ctx, model.UserCore{
		UID:      user.ID,
		AuthType: model.AuthTypePassword,
		Cors:     cors,
		Key:      user.Key,
	})
	if err != nil {
		return "", err
	}

	err = u.repoUser.Update(ctx, map[string]any{
		"updated_at": time.Now(),
		"last_login": time.Now(),
	}, repo.QueryWithEqual("id", user.ID))
	if err != nil {
		return "", err
	}

	return token, nil
}

func (u *User) Logout(ctx context.Context, uid uint) error {
	return u.repoUser.Update(ctx, map[string]any{
		"key":        uuid.NewString(),
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", uid))
}

type LoginThirdURLReq struct {
	APP      bool           `form:"app"`
	Type     model.AuthType `form:"type" binding:"required"`
	Redirect string         `form:"redirect"`
}

func (u *User) LoginThirdURL(ctx context.Context, state string, req LoginThirdURLReq) (string, error) {
	ok, err := u.canAuth(ctx, req.Type)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("third login disabled")
	}

	return u.authMgmt.AuthURL(ctx, req.Type, state, third_auth.AuthURLInAPP(req.APP))
}

type NotifySubBindAuthURLReq struct {
	APP  bool                       `form:"app"`
	Type model.MessageNotifySubType `form:"type" binding:"required"`
}

var thirdAuthTypeM = map[model.MessageNotifySubType]model.AuthType{
	model.MessageNotifySubTypeDingtalk: model.AuthTypeDingtalk,
}

func (u *User) SubBindAuthURL(ctx context.Context, state string, req NotifySubBindAuthURLReq) (string, error) {
	var callbackPath string
	switch req.Type {
	case model.MessageNotifySubTypeDingtalk:
		callbackPath = "/api/user/notify_sub/callback/dingtalk"
	default:
		return "", errors.ErrUnsupported
	}

	notifySub, err := u.repoNotifySub.GetByType(ctx, req.Type)
	if err != nil {
		return "", err
	}
	subInfo := notifySub.Info.Inner()

	author, err := third_auth.New(thirdAuthTypeM[req.Type], third_auth.Config{
		Config: model.AuthConfig{
			Oauth: model.AuthConfigOauth{
				ClientID:     subInfo.ClientID,
				ClientSecret: subInfo.ClientSecret,
			},
		},
		CallbackURL: u.svcPublicAddr.Callback,
	})
	if err != nil {
		return "", err
	}

	return author.AuthURL(ctx, state, third_auth.AuthURLCallbackPath(callbackPath))
}

type NotifySubBindCallbackReq struct {
	State string `form:"state" binding:"required"`
	Code  string `form:"code" binding:"required"`
}

func (u *User) SubBindCallback(ctx context.Context, uid uint, typ model.MessageNotifySubType, req NotifySubBindCallbackReq) error {
	notifySub, err := u.repoNotifySub.GetByType(ctx, typ)
	if err != nil {
		return err
	}
	subInfo := notifySub.Info.Inner()

	author, err := third_auth.New(thirdAuthTypeM[typ], third_auth.Config{
		Config: model.AuthConfig{
			Oauth: model.AuthConfigOauth{
				ClientID:     subInfo.ClientID,
				ClientSecret: subInfo.ClientSecret,
			},
		},
		CallbackURL: u.svcPublicAddr.Callback,
	})
	if err != nil {
		return err
	}

	thirdUser, err := author.User(ctx, req.Code, third_auth.UserWithThirdIDKey(third_auth.ThirdIDKeyUserID))
	if err != nil {
		return err
	}

	return u.repoUser.BindNotifySub(ctx, &model.UserNotiySub{
		Type:    typ,
		UserID:  uid,
		ThirdID: thirdUser.ThirdID,
	})
}

func (u *User) ListNotifySub(ctx context.Context, uid uint) (*model.ListRes[model.UserNotiySub], error) {
	var res model.ListRes[model.UserNotiySub]
	var err error
	res.Items, err = u.repoUser.ListNotifySub(ctx, repo.QueryWithEqual("user_id", uid))
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

type UnbindNotifySubReq struct {
	Type model.MessageNotifySubType `json:"type" binding:"required"`
}

func (u *User) UnbindNotifySub(ctx context.Context, uid uint, req UnbindNotifySubReq) error {
	return u.repoUser.UnbindNotifySub(ctx, uid, req.Type)
}

type LoginThirdCallbackReq struct {
	State string `form:"state" binding:"required"`
	Code  string `form:"code" binding:"required"`
}

func (u *User) LoginThirdCallback(ctx context.Context, typ model.AuthType, req LoginThirdCallbackReq, cors bool) (string, error) {
	ok, err := u.canAuth(ctx, typ)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("third login disabled")
	}

	auth, err := u.svcAuth.Get(ctx)
	if err != nil {
		return "", err
	}

	org, err := u.repoOrg.GetDefaultOrg(ctx)
	if err != nil {
		return "", err
	}

	user, err := u.authMgmt.User(ctx, typ, req.Code)
	if err != nil {
		return "", err
	}

	if auth.NeedReview {
		user.Role = model.UserRoleGuest
	}

	dbUser, err := u.repoUser.CreateThird(ctx, org.ID, user, auth.EnableRegister)
	if err != nil {
		return "", err
	}

	return u.jwt.Gen(ctx, model.UserCore{
		UID:      dbUser.ID,
		AuthType: typ,
		Cors:     cors,
		Key:      dbUser.Key,
	})
}

type UserStatisticsRes struct {
	Avatar      string         `json:"avatar"`
	Name        string         `json:"name"`
	Intro       string         `json:"intro"`
	Point       uint           `json:"point"`
	Role        model.UserRole `json:"role"`
	QACount     int64          `json:"qa_count"`
	BlogCount   int64          `json:"blog_count"`
	AnswerCount int64          `json:"answer_count"`
}

func (u *User) Statistics(ctx context.Context, curUserID uint, userID uint) (*UserStatisticsRes, error) {
	user, err := u.Detail(ctx, userID)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return &UserStatisticsRes{}, nil
		}

		return nil, err
	}

	res := &UserStatisticsRes{
		Avatar: user.Avatar,
		Name:   user.Name,
		Intro:  user.Intro,
		Point:  user.Point,
		Role:   user.Role,
	}
	curUserForumIDs, err := u.ForumIDs(ctx, curUserID)
	if err != nil {
		return nil, err
	}

	if len(curUserForumIDs) == 0 {
		return res, nil
	}

	err = u.repoDisc.Count(ctx, &res.QACount,
		repo.QueryWithEqual("type", model.DiscussionTypeQA),
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithEqual("forum_id", curUserForumIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		return nil, err
	}
	err = u.repoDisc.Count(ctx, &res.BlogCount,
		repo.QueryWithEqual("type", model.DiscussionTypeBlog),
		repo.QueryWithEqual("user_id", userID),
		repo.QueryWithEqual("forum_id", curUserForumIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		return nil, err
	}
	err = u.repoComment.CountByForumIDs(ctx, &res.AnswerCount, curUserForumIDs,
		repo.QueryWithEqual("parent_id", 0),
		repo.QueryWithEqual("user_id", userID),
	)
	if err != nil {
		return nil, err
	}

	return res, nil
}

type UserListPointReq struct {
	*model.Pagination
}

func (u *User) ListPoint(ctx context.Context, uid uint, req UserListPointReq) (*model.ListRes[model.UserPointRecord], error) {
	var res model.ListRes[model.UserPointRecord]
	err := u.repoUserPoint.List(ctx, &res.Items,
		repo.QueryWithEqual("user_id", uid),
		repo.QueryWithOrderBy("created_at DESC"),
		repo.QueryWithPagination(req.Pagination),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoUserPoint.Count(ctx, &res.Total, repo.QueryWithEqual("user_id", uid))
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type ListSearchHistoryReq struct {
	*model.Pagination

	Keyword  *string `form:"keyword"`
	Username *string `form:"username"`
}

func (u *User) ListSearchHistory(ctx context.Context, req ListSearchHistoryReq) (*model.ListRes[model.UserSearchHistory], error) {
	var res model.ListRes[model.UserSearchHistory]
	err := u.repoUser.ListSearchHistory(ctx, &res.Items,
		repo.QueryWithILike("keyword", req.Keyword),
		repo.QueryWithILike("username", req.Username),
		repo.QueryWithOrderBy("created_at DESC, id ASC"),
		repo.QueryWithPagination(req.Pagination),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoUser.CountSearchHistory(ctx, &res.Total,
		repo.QueryWithILike("keyword", req.Keyword),
		repo.QueryWithILike("username", req.Username),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type UserChatReq struct {
	Content string `json:"content" binding:"required"`
}

type UserChaRes struct {
}

func (u *User) Chat(ctx context.Context, uid uint, req UserChatReq) (*UserChaRes, error) {
	return nil, errors.ErrUnsupported
}

func newUser(repoUser *repo.User, genrator *jwt.Generator, auth *Auth, notifySub *repo.MessageNotifySub,
	authMgmt *third_auth.Manager, oc oss.Client, org *repo.Org, userPoint *repo.UserPointRecord, publicAddr *PublicAddress,
	disc *repo.Discussion, comm *repo.Comment, review *repo.UserReview, pub mq.Publisher) *User {
	return &User{
		jwt:            genrator,
		repoUser:       repoUser,
		repoNotifySub:  notifySub,
		svcAuth:        auth,
		authMgmt:       authMgmt,
		oc:             oc,
		repoOrg:        org,
		repoDisc:       disc,
		repoComment:    comm,
		repoUserReview: review,
		pub:            pub,
		repoUserPoint:  userPoint,
		svcPublicAddr:  publicAddr,
		logger:         glog.Module("svc", "user"),
	}
}

func init() {
	registerSvc(newUser)
}
