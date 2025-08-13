package intercept

import (
	"github.com/chaitin/koalaqa/pkg/context"
)

type onlyAdmin struct{}

func newOnlyAdmin() Interceptor {
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
