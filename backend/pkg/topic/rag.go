package topic

import "time"

var TopicRagDocUpdate = newTopic("raglite.events.doc.update", true)
var TopicModelStatus = newTopic("raglite.events.model.status", true)

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

type MsgModelStatusEvent struct {
	ID        string    `json:"id"`        // 模型 ID (RAG ID)
	Status    string    `json:"status"`    // normal | error
	Timestamp time.Time `json:"timestamp"` // 状态变更时间
	Message   string    `json:"message"`   // 错误信息（仅在 error 状态时）
}
