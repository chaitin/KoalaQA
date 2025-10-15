package platform

import "net/http"

type file struct {
	prefix string
}

func (f *file) Platform() PlatformType {
	return PlatformFile
}

func (f *file) ListURL() string {
	return f.prefix + "/list"
}

func (f *file) ListMethod() string {
	return http.MethodGet
}

func (f *file) ExportURL() string {
	return f.prefix + "/export"
}

func newFile() Platform {
	return &file{prefix: "/api/docs/file"}
}

func init() {
	register(newFile)
}
