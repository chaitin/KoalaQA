package platform

type PlatformType uint

const (
	PlatformUnknown PlatformType = iota
	PlatformConfluence
	PlatformFeishu
	PlatformFile
	PlatformNotion
	PlatformSitemap
	PlatformURL
	PlatformWikiJS
	PlatformYuQue
)

type Platform interface {
	Platform() PlatformType
	ListURL() string
	ExportURL() string
}
