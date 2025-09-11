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
	repoSys  *repo.System
	authMgmt *third_auth.Manager
	oc       oss.Client
	logger   *glog.Logger
}

type UserListReq struct {
	model.Pagination

	Name *string `form:"name"`
}

type UserListItem struct {
	model.Base

	Name      string          `json:"name"`
	Role      model.UserRole  `json:"role"`
	Builtin   bool            `json:"builtin"`
	Email     string          `json:"email"`
	LastLogin model.Timestamp `json:"last_login"`
	Key       string          `json:"-"`
}

func (u *User) List(ctx context.Context, req UserListReq) (*model.ListRes[UserListItem], error) {
	var res model.ListRes[UserListItem]
	err := u.repoUser.List(ctx, &res.Items,
		repo.QueryWithPagination(&req.Pagination),
		repo.QueryWithOrderBy("created_at DESC"),
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
	)
	if err != nil {
		return nil, err
	}

	err = u.repoUser.Count(ctx, &res.Total,
		repo.QueryWithILike("name", req.Name),
		repo.QueryWithEqual("invisible", false),
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

func (u *User) Detail(ctx context.Context, id uint) (*UserListItem, error) {
	var item UserListItem
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
	Name string         `json:"name"`
	Role model.UserRole `json:"role" binding:"min=1,max=3"`
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

	if !user.Builtin {
		updateM["role"] = req.Role
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
	Name     string                `form:"name"`
	Password string                `form:"password"`
	Avatar   *multipart.FileHeader `form:"avatar" swaggerignore:"true"`
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

	if avatarPath != "" {
		updateM["avatar"] = avatarPath
	}

	if req.Name != "" {
		updateM["name"] = req.Name
	}

	if req.Password != "" {
		hashPass, err := u.convertPassword(req.Password)
		if err != nil {
			return err
		}

		updateM["password"] = hashPass
	}

	err = u.repoUser.Update(ctx, updateM, repo.QueryWithEqual("id", id))
	if err != nil {
		return err
	}

	if user.Avatar != "" {
		err = u.oc.Delete(ctx, util.TrimFistDir(user.Avatar))
		if err != nil {
			u.logger.WithContext(ctx).WithErr(err).With("avatar", user.Avatar).Warn("remove user avatar failed")
		}
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

func (u *User) convertPassword(password string) (string, error) {
	pwd, err := base64.StdEncoding.DecodeString(password)
	if err != nil {
		return "", err
	}
	decryptPass, err := util.AESDecrypt(pwd, aesKey)
	if err != nil {
		return "", err
	}

	hashPass, err := bcrypt.GenerateFromPassword(decryptPass, bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashPass), nil
}

func (u *User) Register(ctx context.Context, req UserRegisterReq) error {
	var loginConfig model.Auth
	err := u.repoSys.GetValueByKey(ctx, &loginConfig, model.SystemKeyAuth)
	if err != nil {
		return err
	}

	if !loginConfig.EnableRegister {
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

	user := model.User{
		Name:     req.Name,
		Email:    req.Email,
		Builtin:  false,
		Password: hashPass,
		Role:     model.UserRoleUser,
		Key:      uuid.NewString(),
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
	var auth model.Auth
	err := u.repoSys.GetValueByKey(ctx, &auth, model.SystemKeyAuth)
	if err != nil {
		return false, err
	}

	return auth.CanAuth(t), nil
}

func (u *User) Login(ctx context.Context, req UserLoginReq) (string, error) {
	ok, err := u.canAuth(ctx, model.AuthTypePassword)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("password login disabled")
	}

	pwd, err := base64.StdEncoding.DecodeString(req.Password)
	if err != nil {
		return "", err
	}
	decryptPass, err := util.AESDecrypt(pwd, aesKey)
	if err != nil {
		return "", err
	}

	var user model.User
	err = u.repoUser.GetByEmail(ctx, &user, req.Email)
	if err != nil {
		return "", err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), decryptPass)
	if err != nil {
		return "", err
	}

	token, err := u.jwt.Gen(ctx, model.UserInfo{
		UID:      user.ID,
		Role:     user.Role,
		Email:    user.Email,
		Username: user.Name,
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
		"key":       uuid.NewString(),
		"update_at": time.Now(),
	}, repo.QueryWithEqual("id", uid))
}

type LoginThirdURLReq struct {
	Type model.AuthType `form:"type" binding:"required"`
}

func (u *User) LoginThirdURL(ctx context.Context, req LoginThirdURLReq) (string, error) {
	ok, err := u.canAuth(ctx, req.Type)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", errors.New("third login disabled")
	}

	return u.authMgmt.AuthURL(ctx, req.Type)
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

	user, err := u.authMgmt.User(ctx, model.AuthTypeOIDC, req.Code, third_auth.UserWithState(req.State))
	if err != nil {
		return "", err
	}

	userID, err := u.repoUser.CreateThird(ctx, user)
	if err != nil {
		return "", err
	}

	return u.jwt.Gen(ctx, model.UserInfo{
		UID:      userID,
		Role:     user.Role,
		Email:    user.Email,
		Username: user.Name,
	})
}

func newUser(repoUser *repo.User, genrator *jwt.Generator, repoSys *repo.System, authMgmt *third_auth.Manager, oc oss.Client) *User {
	return &User{
		jwt:      genrator,
		repoUser: repoUser,
		repoSys:  repoSys,
		authMgmt: authMgmt,
		oc:       oc,
		logger:   glog.Module("svc", "user"),
	}
}

func init() {
	registerSvc(newUser)
}
