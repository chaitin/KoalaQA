package platform

import "net/http"

type url struct {
	prefix string
}

func (u *url) Platform() PlatformType {
	return PlatformURL
}

func (u *url) ListURL() string {
	return u.prefix + "/list"
}

func (s *url) ListMethod() string {
	return http.MethodGet
}

func (u *url) ExportURL() string {
	return u.prefix + "/export"
}

func newURL() Platform {
	return &url{prefix: "/api/docs/url"}
}

func init() {
	register(newURL)
}
