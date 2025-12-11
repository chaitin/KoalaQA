package topic

var (
	TopicDiscReindex = newTopic("koala.persistence.disc.reindex", true)
)

type MsgDiscReindex struct {
	ForumID uint
	DiscID  uint
	RagID   string
}
