package intercept

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/repo"
)

type onlyAdmin struct{}

func newOnlyAdmin(apiToken *repo.APIToken) Interceptor {
	return &onlyAdmin{}
}

func (oa *onlyAdmin) Intercept(ctx *context.Context) {
	if !ctx.IsAdmin() {
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
