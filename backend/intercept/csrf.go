package intercept

import (
	"net/http"
	"slices"

	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	tracePkg "github.com/chaitin/koalaqa/pkg/trace"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/gin-gonic/gin"
)

type csrf struct {
	secret        string
	ignoreMethods []string
	freeCSRF      bool
	handler       gin.HandlerFunc
}

func newCsrf(cfg config.Config) Interceptor {
	return &csrf{
		ignoreMethods: []string{http.MethodGet, http.MethodOptions, http.MethodHead},
		secret:        cfg.API.CSRFSecret,
		freeCSRF:      cfg.API.FreeCSRF,
	}
}

func (c *csrf) Intercept(ctx *context.Context) {
	salt := ctx.GetUser().Salt
	token := ctx.GetHeader("X-CSRF-TOKEN")

	if c.freeCSRF || slices.Contains(c.ignoreMethods, ctx.Request.Method) || salt == "" ||
		(token != "" && util.Sha1(c.secret+"-"+salt) == token) {
		ctx.Next()
		return
	}

	ctx.JSON(http.StatusBadRequest, context.Response{
		Success: false,
		Data:    "csrf token mismatch",
		TraceID: tracePkg.TraceIDString(ctx),
	})
	ctx.Abort()
}

func (c *csrf) Priority() int {
	return 2
}

func init() {
	registerAPIAuth(newCsrf)
	registerAPINoAuth(newCsrf)
}
