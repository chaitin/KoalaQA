package platform

import "net/http"

type yuque struct{}

func (s *yuque) Platform() PlatformType {
	return PlatformYuQue
}

func (f *yuque) ListMethod() string {
	return http.MethodPost
}

func (d *yuque) PathPrefix() string {
	return "/api/docs/yuque"
}

func newYuQue() Platform {
	return &yuque{}
}

func init() {
	register(newYuQue)
}
