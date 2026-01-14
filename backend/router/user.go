package router

import (
	"encoding/gob"
	"errors"
	"net/http"
	"net/url"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
	"github.com/gin-contrib/sessions"
	"github.com/google/uuid"
)

type user struct {
	expire   int
	svcU     *svc.User
	svcTrend *svc.Trend
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

	token, err := u.svcU.Login(ctx, req, false)
	if err != nil {
		ctx.InternalError(err, "user login failed")
		return
	}

	ctx.Success(token)
}

// LoginCors
// @Summary user cors login
// @Tags user
// @Accept json
// @Param req body svc.UserLoginReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /user/login/cors [post]
func (u *user) LoginCors(ctx *context.Context) {
	var req svc.UserLoginReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	token, err := u.svcU.Login(ctx, req, true)
	if err != nil {
		ctx.InternalError(err, "user login cors failed")
		return
	}

	ctx.Success(token)
}

const stateKey = "third_login_state"

type stateCache struct {
	Cors     bool
	Value    string
	Redirect string
}

func init() {
	gob.Register(stateCache{})
}

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

	var cors bool
	if req.Redirect != "" {
		parseRedirect, err := url.Parse(req.Redirect)
		if err != nil {
			ctx.BadRequest(err)
			return
		}

		cors = parseRedirect.Host != ""
	}

	session := sessions.Default(ctx.Context)
	session.Set(stateKey, stateCache{
		Cors:     cors,
		Value:    state,
		Redirect: req.Redirect,
	})
	session.Save()

	ctx.Success(authURL)
}

func (u *user) loginThirdCallback(ctx *context.Context, typ model.AuthType) {
	var req svc.LoginThirdCallbackReq
	err := ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	session := sessions.Default(ctx.Context)
	stateI := session.Get(stateKey)
	state, ok := stateI.(stateCache)
	if !ok || state.Value != req.State {
		ctx.BadRequest(errors.New("invalid state"))
		return
	}
	session.Delete(stateKey)
	session.Save()

	token, err := u.svcU.LoginThirdCallback(ctx, typ, req, state.Cors)
	if err != nil {
		ctx.InternalError(err, "callback failed")
		return
	}

	if state.Redirect == "" {
		state.Redirect = "/"
	}

	if state.Cors {
		parseRedirect, err := url.Parse(state.Redirect)
		if err != nil {
			ctx.InternalError(err, "parse redirect failed")
			return
		}

		query := parseRedirect.Query()
		query.Set("koala_cors_token", token)
		parseRedirect.RawQuery = query.Encode()
		state.Redirect = parseRedirect.String()
	} else {
		ctx.SetCookie("auth_token", token, u.expire, "/", "", false, true)
	}

	ctx.Redirect(http.StatusFound, state.Redirect)
}

func (u *user) LoginOIDCCallback(ctx *context.Context) {
	u.loginThirdCallback(ctx, model.AuthTypeOIDC)
}

func (u *user) LoginWeComCallback(ctx *context.Context) {
	u.loginThirdCallback(ctx, model.AuthTypeWeCom)
}

func (u *user) LoginWechatCallback(ctx *context.Context) {
	u.loginThirdCallback(ctx, model.AuthTypeWechat)
}

func (u *user) Route(h server.Handler) {
	g := h.Group("/api/user")
	g.POST("/register", u.Register)
	g.POST("/login", u.Login)
	g.GET("/login_method", u.LoginMethod)
	{
		thirdG := g.Group("/login/third")
		thirdG.GET("", u.LoginThirdURL)
		{
			thirdCallbackG := thirdG.Group("/callback")
			thirdCallbackG.GET("/oidc", u.LoginOIDCCallback)
			thirdCallbackG.GET("/we_com", u.LoginWeComCallback)
			thirdCallbackG.GET("/wechat", u.LoginWechatCallback)
		}

	}
}

func newUser(cfg config.Config, u *svc.User, trend *svc.Trend) server.Router {
	return &user{
		expire:   int(cfg.JWT.Expire),
		svcU:     u,
		svcTrend: trend,
	}
}

func init() {
	registerGlobalRouter(newUser)
}
