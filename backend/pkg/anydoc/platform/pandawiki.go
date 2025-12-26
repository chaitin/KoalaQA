package platform

import "net/http"

type pandawiki struct {
	prefix string
}

func (s *pandawiki) Platform() PlatformType {
	return PlatformPandawiki
}

func (s *pandawiki) ListURL() string {
	return s.prefix + "/list"
}

func (s *pandawiki) ListMethod() string {
	return http.MethodGet
}

func (s *pandawiki) ExportURL() string {
	return s.prefix + "/export"
}

func (s *pandawiki) AuthURL() string {
	return s.prefix + "/auth_url"
}

func (s *pandawiki) UserInfoURL() string {
	return s.prefix + "/user"
}

func newPandawiki() Platform {
	return &pandawiki{prefix: "/api/docs/pandawiki"}
}

func init() {
	register(newPandawiki)
}
