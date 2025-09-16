package intercept

import (
	"net/http"

	"github.com/chaitin/koalaqa/pkg/context"
	tracePkg "github.com/chaitin/koalaqa/pkg/trace"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/gin-gonic/gin"

	ginCsrf "github.com/utrack/gin-csrf"
)

type csrf struct {
	handler gin.HandlerFunc
}

func newCsrf() Interceptor {
	return &csrf{
		handler: ginCsrf.Middleware(ginCsrf.Options{
			Secret: util.RandomString(16),
			ErrorFunc: func(c *gin.Context) {
				c.JSON(http.StatusBadRequest, context.Response{
					Success: false,
					Data:    "csrf token mismatch",
					TraceID: tracePkg.TraceIDString(c),
				})
				c.Abort()
			},
			TokenGetter: func(c *gin.Context) string {
				return c.GetHeader("X-CSRF-TOKEN")
			},
		}),
	}
}

func (c *csrf) Intercept(ctx *context.Context) {
	c.handler(ctx.Context)
}

func (c *csrf) Priority() int {
	return -10
}

func init() {
	registerGlobal(newCsrf)
}
