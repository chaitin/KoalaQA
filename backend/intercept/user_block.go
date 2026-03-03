package intercept

import (
	"errors"
	"time"

	"github.com/chaitin/koalaqa/pkg/context"
)

type userBlock struct{}

func newUserBlock() Interceptor {
	return &userBlock{}
}

func (u *userBlock) Intercept(ctx *context.Context) {
	blockUntil := ctx.GetUser().BlockUntil

	if blockUntil < 0 || blockUntil > 0 && time.Now().Unix() < blockUntil {
		ctx.BadRequest(errors.New("user is blocked"))
		ctx.Abort()
		return
	}

	ctx.Next()
}

func (u *userBlock) Priority() int {
	return 1
}

func init() {
	registerAPIAuth(newUserBlock)
}
