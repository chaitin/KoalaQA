package intercept

import (
	"net/http"

	"github.com/chaitin/koalaqa/pkg/context"
)

type cors struct{}

func newCors() Interceptor {
	return &cors{}
}

func (c *cors) Intercept(ctx *context.Context) {
	if ctx.Request.Header.Get("Origin") != "" &&
		(ctx.Request.Method == http.MethodGet || ctx.Request.Method == http.MethodPost && ctx.Request.RequestURI == "/api/user/login/cors") {
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
