package intercept

import (
	"net/http"
	"slices"

	"github.com/chaitin/koalaqa/pkg/context"
)

type cors struct {
	postAllows []string
}

func newCors() Interceptor {
	return &cors{
		postAllows: []string{
			// "/api/user/login/cors",
			"/api/discussion/ask",
			"/api/discussion/summary/content",
			"/api/discussion/ask/session",
		},
	}
}

func (c *cors) Intercept(ctx *context.Context) {
	if ctx.Request.Header.Get("Origin") != "" &&
		(ctx.Request.Method == http.MethodGet || ctx.Request.Method == http.MethodPost && slices.Contains(c.postAllows, ctx.Request.RequestURI)) {
		ctx.Set("cors", true)
		ctx.Header("Access-Control-Allow-Origin", "*")
		ctx.Header("Access-Control-Allow-Methods", "GET, POST")
		ctx.Header("Access-Control-Allow-Headers", "*")
		ctx.Header("Access-Control-Allow-Credentials", "false")
	}
	if ctx.Request.Method == "OPTIONS" {
		ctx.AbortWithStatus(http.StatusNoContent)
	}
	ctx.Next()
}

func (c *cors) Priority() int {
	return -20
}

func init() {
	registerGlobal(newCors)
}
