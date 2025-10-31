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
	jwt     *jwt.Generator
	svcUser *svc.User

	freeAuth bool
}

func newPublicAccess(auth *svc.Auth, cfg config.Config, generator *jwt.Generator, user *svc.User) Interceptor {
	return &publicAccess{
		svcAuth:  auth,
		intAuth:  newAuth(cfg, generator, user),
		jwt:      generator,
		svcUser:  user,
		freeAuth: cfg.API.FreeAuth,
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
		ctx.Next()
		return
	}

	userInfo, err := authUser(ctx, p.freeAuth, p.jwt, p.svcUser)
	if err == nil {
		ctx.SetUser(*userInfo)
	}

	ctx.Next()
}

func (p *publicAccess) Priority() int {
	return 1
}

func init() {
	registerAPINoAuth(newPublicAccess)
}
