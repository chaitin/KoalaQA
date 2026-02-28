package platform

import "net/http"

type feishu struct{}

func (s *feishu) Platform() PlatformType {
	return PlatformFeishu
}

func (f *feishu) ListMethod() string {
	return http.MethodGet
}

func (d *feishu) PathPrefix() string {
	return "/api/docs/feishu"
}

func newFeishu() Platform {
	return &feishu{}
}

func init() {
	register(newFeishu)
}
