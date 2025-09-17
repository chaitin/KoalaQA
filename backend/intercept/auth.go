package intercept

import (
	"errors"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/svc"
)

const tokenPrefix = "Bearer"

type auth struct {
	freeAuth bool
	jwt      *jwt.Generator
	user     *svc.User
}

func newAuth(cfg config.Config, generator *jwt.Generator, user *svc.User) Interceptor {
	return &auth{freeAuth: cfg.API.FreeAuth, jwt: generator, user: user}
}

func (a *auth) Intercept(ctx *context.Context) {
	if a.freeAuth {
		user, err := a.user.Admin(ctx)
		if err != nil {
			ctx.Unauthorized("get adimn failed")
			ctx.Abort()
			return
		}

		ctx.SetUser(model.UserInfo{
			UserCore: model.UserCore{
				UID: user.ID,
				Key: user.Key,
			},
			Username: user.Name,
			Avatar:   user.Avatar,
			Email:    user.Email,
			Role:     user.Role,
		})
		ctx.Next()
		return
	}

	userInfo, err := authUser(ctx, a.jwt, a.user)
	if err != nil {
		ctx.Unauthorized(err.Error())
		ctx.Abort()
		return
	}

	ctx.SetUser(*userInfo)

	ctx.Next()
}

func (a *auth) Priority() int {
	return 0
}

func init() {
	registerAPIAuth(newAuth)
}

func authUser(ctx *context.Context, j *jwt.Generator, user *svc.User) (*model.UserInfo, error) {
	var token = ""
	if authToken := ctx.GetHeader("Authorization"); authToken != "" {
		splitToken := strings.Split(authToken, " ")
		if len(splitToken) == 2 && splitToken[0] == tokenPrefix {
			token = splitToken[1]
		}
	}
	if authToken, _ := ctx.Cookie("auth_token"); authToken != "" {
		token = authToken
	}
	if token == "" {
		return nil, errors.New("auth token is empty")
	}
	userCore, err := j.Verify(token)
	if err != nil {
		return nil, err
	}

	item, err := user.Detail(ctx, userCore.UID)
	if err != nil {
		return nil, err
	}

	if item.Key != userCore.Key {
		return nil, errors.New("invalid key")
	}

	return &model.UserInfo{
		UserCore: *userCore,
		Role:     item.Role,
		Email:    item.Email,
		Username: item.Email,
		Avatar:   item.Avatar,
	}, nil
}
