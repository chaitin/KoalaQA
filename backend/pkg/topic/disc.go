package topic

var (
	TopicDiscChange = newTopic("koala.persistence.discussion.change", true)
)

type MsgDiscChange struct {
	OP       OP     `json:"op"`
	DiscID   uint   `json:"disc_id"`
	DiscUUID string `json:"disc_uuid"`
	RagID    string `json:"rag_id"`
	Type     string `json:"type"`
}
