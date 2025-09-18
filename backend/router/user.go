package router

import (
	"errors"
	"net/http"

	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/gin-contrib/sessions"
	"github.com/google/uuid"
)

type user struct {
	expire int
	svcU   *svc.User
}

// Register
// @Summary register user
// @Tags user
// @Accept json
// @Param req body svc.UserRegisterReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /user/register [post]
func (u *user) Register(ctx *context.Context) {
	var req svc.UserRegisterReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = u.svcU.Register(ctx, req)
	if err != nil {
		ctx.InternalError(err, "register user failed")
		return
	}

	ctx.Success(nil)
}

// LoginMethod
// @Summary login_method detail
// @Tags user
// @Produce json
// @Success 200 {object} context.Response{data=svc.AuthFrontendGetRes}
// @Router /user/login_method [get]
func (u *user) LoginMethod(ctx *context.Context) {
	res, err := u.svcU.LoginMethod(ctx)
	if err != nil {
		ctx.InternalError(err, "get login_method failed")
		return
	}

	ctx.Success(res)
}

// Login
// @Summary user login
// @Tags user
// @Accept json
// @Param req body svc.UserLoginReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /user/login [post]
func (u *user) Login(ctx *context.Context) {
	var req svc.UserLoginReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	token, err := u.svcU.Login(ctx, req)
	if err != nil {
		ctx.InternalError(err, "user login failed")
		return
	}

	ctx.Success(token)
}

const stateKey = "third_login_state"

// LoginThirdURL
// @Summary get user third login url
// @Tags user
// @Param req query svc.LoginThirdURLReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /user/login/third [get]
func (u *user) LoginThirdURL(ctx *context.Context) {
	var req svc.LoginThirdURLReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	state := uuid.NewString()
	authURL, err := u.svcU.LoginThirdURL(ctx, state, req)
	if err != nil {
		ctx.InternalError(err, "get third auth url failed")
		return
	}

	session := sessions.Default(ctx.Context)
	session.Set(stateKey, state)
	session.Save()

	ctx.Success(authURL)
}

func (u *user) LoginOIDCCallback(ctx *context.Context) {
	var req svc.LoginOIDCCallbackReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	session := sessions.Default(ctx.Context)
	state := session.Get(stateKey)
	stateStr, ok := state.(string)
	if !ok || stateStr != req.State {
		ctx.BadRequest(errors.New("invalid state"))
		return
	}
	session.Delete(stateKey)

	token, err := u.svcU.LoginOIDCCallback(ctx, req)
	if err != nil {
		ctx.InternalError(err, "oidc callback failed")
		return
	}

	ctx.SetCookie("auth_token", token, u.expire, "/", "", false, true)
	ctx.Redirect(http.StatusFound, "/")
}

func (u *user) Route(h server.Handler) {
	g := h.Group("/api/user")
	g.POST("/register", u.Register)
	g.POST("/login", u.Login)
	g.GET("/login_method", u.LoginMethod)
	g.GET("/login/third", u.LoginThirdURL)
	g.GET("/login/third/callback/oidc", u.LoginOIDCCallback)
}

func newUser(cfg config.Config, u *svc.User) server.Router {
	return &user{
		expire: int(cfg.JWT.Expire),
		svcU:   u,
	}
}

func init() {
	registerGlobalRouter(newUser)
}
