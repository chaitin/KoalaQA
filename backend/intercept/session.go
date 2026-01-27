package intercept

import (
	"net/http"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/memstore"
	"github.com/gin-gonic/gin"
)

type session struct {
	handler gin.HandlerFunc
}

func newSession() Interceptor {
	store := memstore.NewStore([]byte(util.RandomString(16)))
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
	ctx.SetSameSite(http.SameSiteStrictMode)
	s.handler(ctx.Context)
}

func (s *session) Priority() int {
	return -11
}

func init() {
	registerGlobal(newSession)
}
