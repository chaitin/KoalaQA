package sub

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type KBDoc struct {
	logger  *glog.Logger
	doc     *svc.KBDocument
	dataset *repo.Dataset
	rag     rag.Service
}

func NewKBQA(doc *svc.KBDocument, dataset *repo.Dataset, rag rag.Service) *KBDoc {
	return &KBDoc{
		logger:  glog.Module("sub.kb_doc_rag"),
		doc:     doc,
		dataset: dataset,
		rag:     rag,
	}
}

func (k *KBDoc) MsgType() mq.Message {
	return topic.MsgKBDocument{}
}

func (k *KBDoc) Topic() mq.Topic {
	return topic.TopicKBDocumentRag
}

func (k *KBDoc) Group() string {
	return "koala_kb_document_rag_doc"
}

func (k *KBDoc) AckWait() time.Duration {
	return time.Minute * 2
}

func (k *KBDoc) Concurrent() uint {
	return 10
}

func (k *KBDoc) Handle(ctx context.Context, msg mq.Message) error {
	docMsg := msg.(topic.MsgKBDocument)
	k.logger.WithContext(ctx).With("doc_id", docMsg.DocID).Debug("receive doc msg")
	switch docMsg.OP {
	case topic.OPInsert, topic.OPUpdate:
		return k.handleInsert(ctx, docMsg.KBID, docMsg.DocID)
	case topic.OPDelete:
		return k.handleDelete(ctx, docMsg.RagID)
	}
	return nil
}

func (k *KBDoc) handleInsert(ctx context.Context, kbID uint, docID uint) error {
	logger := k.logger.WithContext(ctx).With("kb_id", kbID).With("doc_id", docID)
	doc, err := k.doc.GetByID(ctx, kbID, docID)
	if err != nil {
		logger.WithErr(err).Error("doc not found")
		return nil
	}
	var content string
	switch doc.DocType {
	case model.DocTypeQuestion:
		content = fmt.Sprintf(`问题：%s\n答案:\n%s`, doc.Title, doc.Markdown)
	case model.DocTypeDocument, model.DocTypeSpace, model.DocTypeWeb:
		url := string(doc.Markdown)
		r, err := oss.Download(ctx, url, oss.WithBucket("anydoc"))
		if err != nil {
			logger.With("url", url).WithErr(err).Error("download markdown failed")
			return nil
		}
		defer r.Close()
		raw, err := io.ReadAll(r)
		if err != nil {
			logger.With("url", url).WithErr(err).Error("read markdown failed")
			return nil
		}
		content = string(raw)
	default:
		logger.With("doc_type", doc.DocType).Error("doc type not support")
		return nil
	}
	ragID, err := k.rag.UpsertRecords(ctx, k.dataset.GetBackendID(ctx), doc.RagID, content, nil)
	if err != nil {
		return err
	}
	err = k.doc.UpdateRagID(ctx, doc.KBID, doc.ID, ragID)
	if err != nil {
		return err
	}
	return nil
}

func (k *KBDoc) handleDelete(ctx context.Context, ragID string) error {
	if err := k.rag.DeleteRecords(ctx, k.dataset.GetBackendID(ctx), []string{ragID}); err != nil {
		return err
	}
	return nil
}
