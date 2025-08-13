package server

import (
	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/pkg/context"
)

type HandlerFunc func(*context.Context)

type Handler interface {
	Group(relativePath string, handlers ...HandlerFunc) Handler
	GroupInterceptors(relativePath string, interceptors ...intercept.Interceptor) Handler
	Handle(httpMethod, relativePath string, handlers ...HandlerFunc)
	GET(relativePath string, handlers ...HandlerFunc)
	PUT(relativePath string, handlers ...HandlerFunc)
	DELETE(relativePath string, handlers ...HandlerFunc)
	POST(relativePath string, handlers ...HandlerFunc)
}
