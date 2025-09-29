package platform

type feishu struct {
	prefix string
}

func (s *feishu) Platform() PlatformType {
	return PlatformFeishu
}

func (s *feishu) ListURL() string {
	return s.prefix + "/list"
}

func (s *feishu) ExportURL() string {
	return s.prefix + "/export"
}

func newFeishu() Platform {
	return &feishu{prefix: "/api/docs/feishu"}
}

func init() {
	register(newFeishu)
}
