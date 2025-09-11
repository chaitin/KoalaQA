package svc

import (
	"context"
	"encoding/base64"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	jwt      *jwt.Generator
	repoUser *repo.User
	repoSys  *repo.System
	authMgmt *third_auth.Manager
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

func (u *User) Create(ctx context.Context, req UserCreateReq) (uint, error) {
	var user model.User
	err := u.repoUser.GetByEmail(ctx, &user, req.Email)
	if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
		return 0, err
	} else if err == nil {
		return 0, errors.New("email already exist")
	}

	cryptPass, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}

	createUser := model.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(cryptPass),
		Role:     model.UserRoleUser,
		Builtin:  false,
	}
	err = u.repoUser.Create(ctx, &createUser)
	if err != nil {
		return 0, err
	}

	return createUser.ID, nil
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

func (u *User) Register(ctx context.Context, req UserRegisterReq) error {
	var loginConfig model.Auth
	err := u.repoSys.GetValueByKey(ctx, &loginConfig, model.SystemKeyAuth)
	if err != nil {
		return err
	}

	if !loginConfig.EnableRegister {
		return errors.New("register disabled")
	}

	pwd, err := base64.StdEncoding.DecodeString(req.Password)
	if err != nil {
		return err
	}
	decryptPass, err := util.AESDecrypt(pwd, aesKey)
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

	hashPass, err := bcrypt.GenerateFromPassword(decryptPass, bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := model.User{
		Name:     req.Name,
		Email:    req.Email,
		Builtin:  false,
		Password: string(hashPass),
		Role:     model.UserRoleUser,
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

func (u *User) Logout(ctx context.Context) error {
	return nil
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

func newUser(repoUser *repo.User, genrator *jwt.Generator, repoSys *repo.System, authMgmt *third_auth.Manager) *User {
	return &User{
		jwt:      genrator,
		repoUser: repoUser,
		repoSys:  repoSys,
		authMgmt: authMgmt,
	}
}

func init() {
	registerSvc(newUser)
}
