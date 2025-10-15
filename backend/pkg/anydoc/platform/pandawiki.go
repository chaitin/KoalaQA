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

func newPandawiki() Platform {
	return &pandawiki{prefix: "/api/docs/pandawiki"}
}

func init() {
	register(newPandawiki)
}
