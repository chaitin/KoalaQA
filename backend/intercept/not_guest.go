package intercept

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
)

type notGuest struct{}

func newNotGuest() Interceptor {
	return &notGuest{}
}

func (n *notGuest) Intercept(ctx *context.Context) {
	if ctx.GetUser().Role == model.UserRoleGuest {
		ctx.Forbidden("user is guest")
		ctx.Abort()
		return
	}

	ctx.Next()
}

func (n *notGuest) Priority() int {
	return 2
}

func init() {
	registerNotGuestAPI(newNotGuest)
}
