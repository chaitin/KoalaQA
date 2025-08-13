package router

import (
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/chaitin/koalaqa/docs"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/server"
)

type swagger struct {
	enable bool
}

func (s *swagger) Route(e server.Handler) {
	if !s.enable {
		return
	}

	g := e.Group("/swagger")
	g.GET("/*any", server.TranserHandler(ginSwagger.WrapHandler(swaggerFiles.Handler)))
}

func newSwagger(cfg config.Config) server.Router {
	return &swagger{
		enable: cfg.API.DEV,
	}
}

func init() {
	registerGlobalRouter(newSwagger)
}
