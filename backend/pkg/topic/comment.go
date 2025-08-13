package topic

var (
	TopicCommentChange = newTopic("koala.persistence.comment.change", true)
)

type MsgCommentChange struct {
	OP       OP     `json:"op"`
	DiscID   uint   `json:"disc_id"`
	DiscUUID string `json:"disc_uuid"`
	CommID   uint   `json:"comm_id"`
	RagID    string `json:"rag_id"`
}
