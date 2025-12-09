package router

import (
	"fmt"
	"net/http"
	"path"
	"path/filepath"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type sitemap struct {
	publicAddress *svc.PublicAddress

	logger *glog.Logger
}

func (s *sitemap) Get(ctx *context.Context) {
	filename := filepath.Join("sitemap", ctx.Param("filename"))
	if path.Ext(filename) != ".xml" {
		ctx.Status(http.StatusNotFound)
		return
	}

	exist, err := util.FileExist(filename)
	if err != nil {
		s.logger.WithContext(ctx).WithErr(err).With("file", filename).Warn("check file exis failed")
		ctx.Status(http.StatusInternalServerError)
		return
	}

	if !exist {
		ctx.Status(http.StatusNotFound)
		return
	}

	ctx.File(filename)
}

func (s *sitemap) Robots(ctx *context.Context) {
	publicAddress, err := s.publicAddress.Get(ctx)
	if err != nil {
		s.logger.WithContext(ctx).WithErr(err).Warn("get public address failed")
		ctx.Status(http.StatusInternalServerError)
		return
	}

	ctx.Writer.Header().Set("Content-Type", "text/plain")
	if publicAddress.Address == "" {
		ctx.Status(http.StatusNotFound)
		return
	}

	exist, err := util.FileExist("sitemap/sitemap_index.xml")
	if err != nil {
		s.logger.WithContext(ctx).WithErr(err).Warn("check sitemap index exist failed")
		ctx.Status(http.StatusInternalServerError)
	}

	if !exist {
		ctx.Status(http.StatusNotFound)
		return
	}

	ctx.String(http.StatusOK, fmt.Sprintf(`Sitemap: %s`, publicAddress.FullURL("/api/sitemap/sitemap_index.xml")))
}

func (s *sitemap) Route(h server.Handler) {
	g := h.Group("/sitemap")
	g.GET("/robots.txt", s.Robots)
	g.GET("/:filename", s.Get)
}

func newSitemap(publicAddress *svc.PublicAddress) server.Router {
	return &sitemap{logger: glog.Module("router", "sitemap"), publicAddress: publicAddress}
}

func init() {
	registerApiRouter(newSitemap)
}
