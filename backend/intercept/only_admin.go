package intercept

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/repo"
)

type onlyAdmin struct {
	logger   *glog.Logger
	apiToken *repo.APIToken
}

func newOnlyAdmin(apiToken *repo.APIToken) Interceptor {
	return &onlyAdmin{
		logger:   glog.Module("intercept", "only_admin"),
		apiToken: apiToken,
	}
}

func (oa *onlyAdmin) checkAPIToken(ctx *context.Context) bool {
	token := ctx.GetHeader("X-KOALA-TOKEN")
	if token == "" {
		return false
	}

	exist, err := oa.apiToken.Exist(ctx, repo.QueryWithEqual("token", token))
	if err != nil {
		oa.logger.WithContext(ctx).WithErr(err).With("token", token).Warn("check token failed")
		return false
	}

	return exist
}

func (oa *onlyAdmin) Intercept(ctx *context.Context) {
	if !ctx.IsAdmin() && !oa.checkAPIToken(ctx) {
		ctx.Forbidden("user is not admin")
		ctx.Abort()
		return
	}

	ctx.Next()
}

func (oa *onlyAdmin) Priority() int {
	return 1
}

func init() {
	registerAdminAPI(newOnlyAdmin)
}
