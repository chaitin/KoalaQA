package topic

import (
	"github.com/chaitin/koalaqa/model"
)

var AnydocTaskExportTopic = newTopic("anydoc.persistence.doc.task.export", true)

type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_process"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusFailed     TaskStatus = "failed"
	TaskStatusTimeout    TaskStatus = "timeout"
)

type TaskInfo struct {
	TaskHead
	TaskBody
}

type TaskHead struct {
	model.PlatformOpt

	PlatformID string         `json:"platform_id"`
	TaskID     string         `json:"task_id"`
	DocID      string         `json:"doc_id"`
	DocType    model.FileType `json:"doc_type"`
	Status     TaskStatus     `json:"status"`
	Err        string         `json:"err"`
}

type TaskBody struct {
	Markdown string `json:"markdown"`
	JSON     string `json:"json"`
}
