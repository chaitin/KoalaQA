package intercept

import (
	"errors"
	"net/http"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

const tokenPrefix = "Bearer"

type auth struct {
	freeAuth bool
	jwt      *jwt.Generator
	user     *svc.User
	apiToken *repo.APIToken
}

func newAuth(cfg config.Config, generator *jwt.Generator, user *svc.User, apiToken *repo.APIToken) Interceptor {
	return &auth{freeAuth: cfg.API.FreeAuth, jwt: generator, user: user, apiToken: apiToken}
}

func (a *auth) Intercept(ctx *context.Context) {
	userInfo, err := authUser(ctx, a.freeAuth, a.jwt, a.user, a.apiToken)
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

func authUser(ctx *context.Context, freeAuth bool, j *jwt.Generator, user *svc.User, apiToken *repo.APIToken) (*model.UserInfo, error) {
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

	var (
		item        *model.User
		core        model.UserCore
		reqAPIToken = ctx.GetHeader("X-KOALA-TOKEN")
	)
	if token == "" {
		if freeAuth {
			var err error
			item, err = user.Admin(ctx)
			if err != nil {
				return nil, err
			}
		} else if reqAPIToken != "" && strings.HasPrefix(ctx.Request.RequestURI, "/api/admin") {
			exist, err := apiToken.Exist(ctx, repo.QueryWithEqual("token", reqAPIToken))
			if err != nil {
				return nil, errors.New("check api token failed")
			}

			if !exist {
				return nil, errors.New("invalid api token")
			}
			return &model.UserInfo{
				UserCore: model.UserCore{
					AuthType: model.AuthTypeAPIToken,
				},
				UserBasic: model.UserBasic{
					Role: model.UserRoleAdmin,
				},
			}, nil
		} else {
			return nil, errors.New("auth token is empty")
		}

		core = model.UserCore{
			UID:      item.ID,
			AuthType: model.AuthTypeFree,
			Key:      item.Key,
			Salt:     item.Key,
		}
	} else {
		userCore, err := j.Verify(token)
		if err != nil {
			return nil, err
		}

		if userCore.Cors && ctx.Request.Method != http.MethodGet &&
			!(ctx.Request.Method == http.MethodPost && ctx.Request.RequestURI == "/api/user/login/cors") {
			return nil, errors.New("request method permission deny")
		}

		item, err = user.Detail(ctx, userCore.UID)
		if err != nil {
			return nil, err
		}

		if item.Key != userCore.Key {
			return nil, errors.New("invalid key")
		}
		core = *userCore
	}

	return &model.UserInfo{
		UserCore:   core,
		UserBasic:  item.UserBasic,
		NoPassword: item.Password == "",
	}, nil
}
