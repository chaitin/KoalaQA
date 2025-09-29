package platform

type dingtalk struct {
	prefix string
}

func (s *dingtalk) Platform() PlatformType {
	return PlatformDingtalk
}

func (s *dingtalk) ListURL() string {
	return s.prefix + "/list"
}

func (s *dingtalk) ExportURL() string {
	return s.prefix + "/export"
}

func newDingtalk() Platform {
	return &dingtalk{prefix: "/api/docs/dingtalk"}
}

func init() {
	register(newDingtalk)
}
