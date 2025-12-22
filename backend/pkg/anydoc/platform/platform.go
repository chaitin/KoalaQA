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
	PlatformPandawiki
	PlatformDingtalk
)

type Platform interface {
	Platform() PlatformType
	ListURL() string
	ListMethod() string
	ExportURL() string
	AuthURL() string
	UserInfoURL() string
}
