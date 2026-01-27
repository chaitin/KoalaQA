package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type modelStatus struct {
	logger  *glog.Logger
	repoLLM *repo.LLM
}

func newModelStatus(llm *repo.LLM) *modelStatus {
	return &modelStatus{
		repoLLM: llm,
		logger:  glog.Module("sub", "model_status"),
	}
}

func (m *modelStatus) MsgType() mq.Message {
	return topic.MsgModelStatusEvent{}
}

func (m *modelStatus) Topic() mq.Topic {
	return topic.TopicModelStatus
}

func (m *modelStatus) Group() string {
	return "koala_model_status_update"
}

func (m *modelStatus) AckWait() time.Duration {
	return time.Minute * 1
}

func (m *modelStatus) Concurrent() uint {
	return 1
}

func (m *modelStatus) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgModelStatusEvent)
	logger := m.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive model status update msg")

	return m.updateModelStatus(ctx, data)
}

func (m *modelStatus) updateModelStatus(ctx context.Context, data topic.MsgModelStatusEvent) error {
	logger := m.logger.WithContext(ctx).With("msg", data)
	logger.Info("update llm status")

	// 映射状态
	var llmStatus model.LLMStatus
	switch data.Status {
	case "normal":
		llmStatus = model.LLMStatusNormal
	case "error":
		llmStatus = model.LLMStatusError
	default:
		logger.Warn("unknown model status", "status", data.Status)
		return nil
	}

	updateM := map[string]any{
		"status":     llmStatus,
		"message":    data.Message,
		"updated_at": data.Timestamp,
	}

	err := m.repoLLM.UpdateByRagID(ctx, data.ID, updateM)
	if err != nil {
		logger.WithErr(err).Warn("update llm status failed")
		return err
	}

	logger.Info("update llm status success", "rag_id", data.ID, "status", llmStatus)
	return nil
}
