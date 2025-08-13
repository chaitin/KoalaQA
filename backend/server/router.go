package server

import (
	"net/http"
	"sort"

	"github.com/chaitin/koalaqa/intercept"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
)

// @title KoalaQA API
// @version 2.0
// @description KoalaQA API swagger document.

// @BasePath /api
type Router interface {
	Route(Handler)
}

type routerGroup struct {
	rg *gin.RouterGroup
}

func (rg *routerGroup) Handle(httpMethod, relativePath string, handlers ...HandlerFunc) {
	rg.rg.Handle(httpMethod, relativePath, wrapHandlers(handlers...)...)
}

func (rg *routerGroup) GET(relativePath string, handlers ...HandlerFunc) {
	rg.Handle(http.MethodGet, relativePath, handlers...)
}

func (rg *routerGroup) PUT(relativePath string, handlers ...HandlerFunc) {
	rg.Handle(http.MethodPut, relativePath, handlers...)
}

func (rg *routerGroup) DELETE(relativePath string, handlers ...HandlerFunc) {
	rg.Handle(http.MethodDelete, relativePath, handlers...)
}

func (rg *routerGroup) POST(relativePath string, handlers ...HandlerFunc) {
	rg.Handle(http.MethodPost, relativePath, handlers...)
}

func (rg *routerGroup) Group(relativePath string, handlers ...HandlerFunc) Handler {
	return &routerGroup{
		rg: rg.rg.Group(relativePath, wrapHandlers(handlers...)...),
	}
}

func (rg *routerGroup) GroupInterceptors(relativePath string, interceptors ...intercept.Interceptor) Handler {
	return rg.Group(relativePath, interceptorToHandler(interceptors)...)
}

type In struct {
	fx.In

	Config       config.Config
	Interceptors []intercept.Interceptor `group:"global_interceptors"`
	Routes       []Router                `group:"global_routers"`
}

type Engine struct {
	in In

	e *gin.Engine
}

func New(in In) *Engine {
	e := &Engine{in: in}
	if in.Config.API.DEV {
		gin.SetMode(gin.DebugMode)
		e.e = gin.Default()
	} else {
		gin.SetMode(gin.ReleaseMode)
		e.e = gin.New()
		e.e.Use(gin.Recovery())
	}

	e.e.ContextWithFallback = true

	return e
}

func (e *Engine) Handle(httpMethod, relativePath string, handlers ...HandlerFunc) {
	e.e.Handle(httpMethod, relativePath, wrapHandlers(handlers...)...)
}

func (e *Engine) GET(relativePath string, handlers ...HandlerFunc) {
	e.Handle(http.MethodGet, relativePath, handlers...)
}

func (e *Engine) PUT(relativePath string, handlers ...HandlerFunc) {
	e.Handle(http.MethodPut, relativePath, handlers...)
}

func (e *Engine) DELETE(relativePath string, handlers ...HandlerFunc) {
	e.Handle(http.MethodDelete, relativePath, handlers...)
}

func (e *Engine) POST(relativePath string, handlers ...HandlerFunc) {
	e.Handle(http.MethodPost, relativePath, handlers...)
}

func (e *Engine) Group(relativePath string, handlers ...HandlerFunc) Handler {
	return &routerGroup{
		rg: e.e.Group(relativePath, wrapHandlers(handlers...)...),
	}
}

func (e *Engine) GroupInterceptors(relativePath string, interceptors ...intercept.Interceptor) Handler {
	return e.Group(relativePath, interceptorToHandler(interceptors)...)
}

func (r *Engine) Init() {
	for _, interceptor := range r.in.Interceptors {
		r.e.Use(wrapHandler(interceptor.Intercept))
	}

	for _, route := range r.in.Routes {
		route.Route(r)
	}
}

func (e *Engine) Run() error {
	return e.e.Run(e.in.Config.API.Listen)
}

func wrapHandler(fn HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		fn(context.GetContext(c))
	}
}

func wrapHandlers(handlers ...HandlerFunc) []gin.HandlerFunc {
	wrapHandlers := make([]gin.HandlerFunc, len(handlers))
	for i := range handlers {
		wrapHandlers[i] = wrapHandler(handlers[i])
	}
	return wrapHandlers
}

func interceptorToHandler(interceptors []intercept.Interceptor) []HandlerFunc {
	handlers := make([]HandlerFunc, len(interceptors))

	sort.Slice(interceptors, func(i, j int) bool {
		return interceptors[i].Priority() < interceptors[j].Priority()
	})

	for i, interceptor := range interceptors {
		handlers[i] = interceptor.Intercept
	}
	return handlers
}

func TranserHandler(fn gin.HandlerFunc) HandlerFunc {
	return func(ctx *context.Context) {
		fn(ctx.Context)
	}
}
