package platform

import "net/http"

type sitemap struct{}

func (s *sitemap) Platform() PlatformType {
	return PlatformSitemap
}

func (s *sitemap) ListMethod() string {
	return http.MethodGet
}

func (d *sitemap) PathPrefix() string {
	return "/api/docs/sitemap"
}

func newSitemap() Platform {
	return &sitemap{}
}

func init() {
	register(newSitemap)
}
