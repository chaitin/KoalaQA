package platform

import "net/http"

type pandawiki struct{}

func (s *pandawiki) Platform() PlatformType {
	return PlatformPandawiki
}

func (s *pandawiki) ListMethod() string {
	return http.MethodGet
}

func (d *pandawiki) PathPrefix() string {
	return "/api/docs/pandawiki"
}

func newPandawiki() Platform {
	return &pandawiki{}
}

func init() {
	register(newPandawiki)
}
