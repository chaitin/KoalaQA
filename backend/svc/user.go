package svc

import (
	"context"
	"encoding/base64"
	"errors"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	jwt      *jwt.Generator
	repoUser *repo.User
	authMgmt *third_auth.Manager
	svcAuth  *Auth
	oc       oss.Client
	repoOrg  *repo.Org
	logger   *glog.Logger
}

type UserListReq struct {
	model.Pagination

	OrgID   *uint   `form:"org_id"`
	OrgName *string `form:"org_name"`
	Name    *string `form:"name"`
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
		repo.QueryWithOrderBy("created_at DESC"),
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
		repo.QueryWithEqual("org_ids", req.OrgID, repo.EqualOPValIn),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoUser.Count(ctx, &res.Total,
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
		repo.QueryWithEqual("org_ids", req.OrgID, repo.EqualOPValIn),
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

func (u *User) Admin(ctx context.Context) (*model.User, error) {
	var dbUser model.User
	err := u.repoUser.GetAdmin(ctx, &dbUser)
	if err != nil {
		return nil, err
	}

	return &dbUser, nil
}

type UserUpdateReq struct {
	Name        string           `json:"name"`
	OldPassword string           `json:"old_password"`
	Password    string           `json:"password"`
	Role        model.UserRole   `json:"role" binding:"min=1,max=3"`
	OrgIDs      model.Int64Array `json:"org_ids"`
}

func (u *User) Update(ctx context.Context, id uint, req UserUpdateReq) error {
	var user model.User
	err := u.repoUser.GetByID(ctx, &user, id)
	if err != nil {
		return err
	}

	updateM := map[string]any{
		"updated_at": time.Now(),
	}

	if user.Name != "" {
		updateM["name"] = req.Name
	}

	if req.OldPassword != "" && req.Password != "" {
		err = u.checkPassword(req.OldPassword, user.Password)
		if err != nil {
			return err
		}

		hashPass, err := u.convertPassword(req.Password)
		if err != nil {
			return err
		}

		updateM["password"] = hashPass
	}

	if !user.Builtin {
		updateM["role"] = req.Role
	}

	if len(req.OrgIDs) > 0 {
		err = u.repoOrg.FilterIDs(ctx, &req.OrgIDs)
		if err != nil {
			return err
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

type UserUpdateInfoReq struct {
	Name        string                `form:"name"`
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
	if !user.Builtin && req.Password != "" && req.OldPassword != "" {
		err = u.checkPassword(req.OldPassword, user.Password)
		if err != nil {
			return err
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

	if user.Avatar != "" {
		err = u.oc.Delete(ctx, util.TrimFirstDir(user.Avatar))
		if err != nil {
			u.logger.WithContext(ctx).WithErr(err).With("avatar", user.Avatar).Warn("remove user avatar failed")
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
	}, repo.QueryWithEqual("id", req.UserIDs, repo.EqualOPEqAny))
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

	err = u.repoUser.Delete(ctx, repo.QueryWithEqual("id", id))
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

	org, err := u.repoOrg.GetBuiltin(ctx)
	if err != nil {
		return err
	}

	user := model.User{
		Name:     req.Name,
		Email:    req.Email,
		Builtin:  false,
		Password: hashPass,
		Role:     model.UserRoleUser,
		Key:      uuid.NewString(),
		OrgIDs:   model.Int64Array{int64(org.ID)},
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

func (u *User) Login(ctx context.Context, req UserLoginReq) (string, error) {
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
		UID: user.ID,
		Key: user.Key,
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

	return u.authMgmt.AuthURL(ctx, req.Type, state, req.Redirect)
}

type LoginOIDCCallbackReq struct {
	State string `form:"state" binding:"required"`
	Code  string `form:"code" binding:"required"`
}

func (u *User) LoginOIDCCallback(ctx context.Context, req LoginOIDCCallbackReq) (string, error) {
	ok, err := u.canAuth(ctx, model.AuthTypeOIDC)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("oidc login disabled")
	}

	org, err := u.repoOrg.GetBuiltin(ctx)
	if err != nil {
		return "", err
	}

	user, err := u.authMgmt.User(ctx, model.AuthTypeOIDC, req.Code)
	if err != nil {
		return "", err
	}

	dbUser, err := u.repoUser.CreateThird(ctx, org.ID, user)
	if err != nil {
		return "", err
	}

	return u.jwt.Gen(ctx, model.UserCore{
		UID: dbUser.ID,
		Key: dbUser.Key,
	})
}

func newUser(repoUser *repo.User, genrator *jwt.Generator, auth *Auth, authMgmt *third_auth.Manager, oc oss.Client, org *repo.Org) *User {
	return &User{
		jwt:      genrator,
		repoUser: repoUser,
		svcAuth:  auth,
		authMgmt: authMgmt,
		oc:       oc,
		repoOrg:  org,
		logger:   glog.Module("svc", "user"),
	}
}

func init() {
	registerSvc(newUser)
}
