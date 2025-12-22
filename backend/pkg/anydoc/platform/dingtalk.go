package platform

import "net/http"

type dingtalk struct {
	prefix string
}

func (s *dingtalk) Platform() PlatformType {
	return PlatformDingtalk
}

func (s *dingtalk) ListURL() string {
	return s.prefix + "/list"
}

func (s *dingtalk) ListMethod() string {
	return http.MethodPost
}

func (s *dingtalk) ExportURL() string {
	return s.prefix + "/export"
}

func (s *dingtalk) AuthURL() string {
	return s.prefix + "/auth_url"
}

func (s *dingtalk) UserInfoURL() string {
	return s.prefix + "/user"
}

func newDingtalk() Platform {
	return &dingtalk{prefix: "/api/docs/dingtalk"}
}

func init() {
	register(newDingtalk)
}
