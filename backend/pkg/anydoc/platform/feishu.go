package platform

import "net/http"

type feishu struct {
	prefix string
}

func (s *feishu) Platform() PlatformType {
	return PlatformFeishu
}

func (s *feishu) ListURL() string {
	return s.prefix + "/list"
}

func (f *feishu) ListMethod() string {
	return http.MethodGet
}

func (s *feishu) ExportURL() string {
	return s.prefix + "/export"
}

func (s *feishu) AuthURL() string {
	return s.prefix + "/auth_url"
}

func (s *feishu) UserInfoURL() string {
	return s.prefix + "/user"
}

func newFeishu() Platform {
	return &feishu{prefix: "/api/docs/feishu"}
}

func init() {
	register(newFeishu)
}
