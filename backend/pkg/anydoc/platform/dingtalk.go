package platform

import "net/http"

type dingtalk struct{}

func (s *dingtalk) Platform() PlatformType {
	return PlatformDingtalk
}

func (s *dingtalk) ListMethod() string {
	return http.MethodPost
}

func (d *dingtalk) PathPrefix() string {
	return "/api/docs/dingtalk"
}

func newDingtalk() Platform {
	return &dingtalk{}
}

func init() {
	register(newDingtalk)
}
