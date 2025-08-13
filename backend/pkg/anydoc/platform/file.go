package platform

type file struct {
	prefix string
}

func (f *file) Platform() PlatformType {
	return PlatformFile
}

func (f *file) ListURL() string {
	return f.prefix + "/list"
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
