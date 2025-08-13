package intercept

import (
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/jwt"
	"github.com/chaitin/koalaqa/svc"
)

type publicAccess struct {
	svcAuth *svc.Auth
	intAuth Interceptor
}

func newPublicAccess(auth *svc.Auth, cfg config.Config, generator *jwt.Generator, user *svc.User) Interceptor {
	return &publicAccess{
		svcAuth: auth,
		intAuth: newAuth(cfg, generator, user),
	}
}

func (p *publicAccess) Intercept(ctx *context.Context) {
	auth, err := p.svcAuth.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get auth info failed")
		ctx.Abort()
		return
	}

	if !auth.PublicAccess {
		p.intAuth.Intercept(ctx)
	}

	ctx.Next()
}

func (p *publicAccess) Priority() int {
	return 1
}

func init() {
	registerAPINoAuth(newPublicAccess)
}
