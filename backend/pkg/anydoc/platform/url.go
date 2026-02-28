package platform

import "net/http"

type url struct{}

func (u *url) Platform() PlatformType {
	return PlatformURL
}

func (s *url) ListMethod() string {
	return http.MethodGet
}

func (d *url) PathPrefix() string {
	return "/api/docs/url"
}

func newURL() Platform {
	return &url{}
}

func init() {
	register(newURL)
}
