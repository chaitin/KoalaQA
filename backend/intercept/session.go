package intercept

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

type session struct {
	handler gin.HandlerFunc
}

func newSession() Interceptor {
	store := cookie.NewStore([]byte(util.RandomString(16)))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
	})

	return &session{
		handler: sessions.Sessions("koala_session", store),
	}
}

func (s *session) Intercept(ctx *context.Context) {
	s.handler(ctx.Context)
}

func (s *session) Priority() int {
	return -11
}

func init() {
	registerGlobal(newSession)
}
