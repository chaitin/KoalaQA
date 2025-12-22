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

func (s *sitemap) AuthURL() string {
	return s.prefix + "/auth_url"
}

func (s *sitemap) UserInfoURL() string {
	return s.prefix + "/user"
}

func newSitemap() Platform {
	return &sitemap{prefix: "/api/docs/sitemap"}
}

func init() {
	register(newSitemap)
}
