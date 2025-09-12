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
			UID:      user.ID,
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
	token := ctx.GetHeader("Authorization")
	splitToken := strings.Split(token, " ")
	if len(splitToken) != 2 || splitToken[0] != tokenPrefix {
		return nil, errors.New("invalid auth token")
	}

	userInfo, err := j.Verify(splitToken[1])
	if err != nil {
		return nil, err
	}

	item, err := user.Detail(ctx, userInfo.UID)
	if err != nil {
		return nil, err
	}

	if item.Key != userInfo.Key {
		return nil, errors.New("invalid key")
	}

	return userInfo, nil
}
