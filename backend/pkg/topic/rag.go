package topic

var TopicRagDocUpdate = newTopic("raglite.events.doc.update", true)

type RagDocStatus string

const (
	RagDocStatusPending   RagDocStatus = "PENDING"
	RagDocStatusRunning   RagDocStatus = "RUNNING"
	RagDocStatusSucceeded RagDocStatus = "SUCCEEDED"
	RagDocStatusFailed    RagDocStatus = "FAILED"
	RagDocStatusReindex   RagDocStatus = "REINDEX" // 等待重新索引消息发送
)

type MsgRagDocUpdateEvent struct {
	ID        string       `json:"id"`
	DatasetID string       `json:"dataset_id"`
	Status    RagDocStatus `json:"status"`
	Keywords  []string     `json:"keywords"`
	Message   string       `json:"message"`
}
