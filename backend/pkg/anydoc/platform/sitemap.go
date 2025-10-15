package platform

import "net/http"

type sitemap struct {
	prefix string
}

func (s *sitemap) Platform() PlatformType {
	return PlatformSitemap
}

func (s *sitemap) ListURL() string {
	return s.prefix + "/list"
}

func (s *sitemap) ListMethod() string {
	return http.MethodGet
}

func (s *sitemap) ExportURL() string {
	return s.prefix + "/export"
}

func newSitemap() Platform {
	return &sitemap{prefix: "/api/docs/sitemap"}
}

func init() {
	register(newSitemap)
}
