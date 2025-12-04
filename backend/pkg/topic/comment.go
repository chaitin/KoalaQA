package topic

var (
	TopicCommentChange = newTopic("koala.persistence.comment.change", true)
)

type MsgCommentChange struct {
	OP            OP     `json:"op"`
	ForumID       uint   `json:"forum_id"`
	DiscID        uint   `json:"disc_id"`
	DiscUUID      string `json:"disc_uuid"`
	CommID        uint   `json:"comm_id"`
	RagID         string `json:"rag_id"`
	NotUpdateDisc bool   `json:"not_update_disc"`
}
