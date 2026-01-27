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

type ragDoc struct {
	logger      *glog.Logger
	repoDataset *repo.Dataset
	repoDisc    *repo.Discussion
	repoDoc     *repo.KBDocument
}

func newRagDoc(dataset *repo.Dataset, disc *repo.Discussion, doc *repo.KBDocument) *ragDoc {
	return &ragDoc{
		repoDataset: dataset,
		repoDisc:    disc,
		repoDoc:     doc,
		logger:      glog.Module("sub", "rag_doc"),
	}
}

func (r *ragDoc) MsgType() mq.Message {
	return topic.MsgRagDocUpdateEvent{}
}

func (r *ragDoc) Topic() mq.Topic {
	return topic.TopicRagDocUpdate
}

func (r *ragDoc) Group() string {
	return "koala_rag_doc_update"
}

func (r *ragDoc) AckWait() time.Duration {
	return time.Minute * 1
}

func (r *ragDoc) Concurrent() uint {
	return 1
}

func (r *ragDoc) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgRagDocUpdateEvent)
	logger := r.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive rag doc update msg")

	if data.DatasetID == r.repoDataset.GetBackendID(ctx) {
		return r.updateKbDocStatus(ctx, data)
	}

	return r.updateDiscussion(ctx, data)
}

func (r *ragDoc) updateDiscussion(ctx context.Context, data topic.MsgRagDocUpdateEvent) error {
	if data.Status != topic.RagDocStatusSucceeded {
		return nil
	}

	logger := r.logger.WithContext(ctx).With("msg", data)
	logger.Info("update discussion tags")

	if data.Keywords == nil {
		logger.Debug("nil keywords, skip update")
		return nil
	}

	err := r.repoDisc.UpdateTagsByRagID(ctx, data.ID, data.Keywords)
	if err != nil {
		logger.WithErr(err).Warn("update discussion tags failed")
		return err
	}

	return nil
}

var kbDocStatusMap = map[topic.RagDocStatus][2]model.DocStatus{
	topic.RagDocStatusRunning:   {model.DocStatusPendingApply, model.DocStatusAppling},
	topic.RagDocStatusSucceeded: {model.DocStatusAppling, model.DocStatusApplySuccess},
	topic.RagDocStatusFailed:    {model.DocStatusAppling, model.DocStatusApplyFailed},
}

func (r *ragDoc) updateKbDocStatus(ctx context.Context, data topic.MsgRagDocUpdateEvent) error {
	status, ok := kbDocStatusMap[data.Status]
	if !ok {
		return nil
	}

	logger := r.logger.WithContext(ctx).With("msg", data)

	logger.Info("upadte kb_doc status")
	updateM := map[string]any{
		"status":     status[1],
		"updated_at": time.Now(),
	}
	switch data.Status {
	case topic.RagDocStatusFailed:
		if data.Message == "" {
			data.Message = "rag apply failed"
		}
		updateM["message"] = data.Message
	case topic.RagDocStatusSucceeded:
		updateM["message"] = ""
	}

	err := r.repoDoc.Update(ctx, updateM, repo.QueryWithEqual("rag_id", data.ID), repo.QueryWithEqual("status", status[0]))
	if err != nil {
		logger.WithErr(err).Warn("update kb doc status failed", err)
		return err
	}

	return nil
}
