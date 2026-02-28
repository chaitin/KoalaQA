package platform

import "net/http"

type file struct{}

func (f *file) Platform() PlatformType {
	return PlatformFile
}

func (f *file) ListMethod() string {
	return http.MethodPost
}

func (d *file) PathPrefix() string {
	return "/api/docs/file"
}

func newFile() Platform {
	return &file{}
}

func init() {
	register(newFile)
}
