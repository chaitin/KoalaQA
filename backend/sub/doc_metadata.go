package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type docMetadata struct {
	logger *glog.Logger

	dataset *repo.Dataset
	doc     *repo.KBDocument
	rag     rag.Service
}

func newDocMetadata(doc *repo.KBDocument, rag rag.Service, dataset *repo.Dataset) *docMetadata {
	return &docMetadata{
		logger:  glog.Module("sub", "doc_metadata"),
		doc:     doc,
		rag:     rag,
		dataset: dataset,
	}
}

func (d *docMetadata) MsgType() mq.Message {
	return topic.MsgDocMetadata{}
}

func (d *docMetadata) Topic() mq.Topic {
	return topic.TopicDocMetadata
}

func (d *docMetadata) Group() string {
	return "koala_doc_metadata"
}

func (d *docMetadata) AckWait() time.Duration {
	return time.Minute * 2
}

func (d *docMetadata) Concurrent() uint {
	return 1
}

func (d *docMetadata) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDocMetadata)

	logger := d.logger.WithContext(ctx).With("msg", data)
	logger.Info("receive doc metadata update msg")

	var docs []model.KBDocument
	docs, err := d.doc.ListSpaceFolderAllDoc(ctx, data.IDs)
	if err != nil {
		logger.WithErr(err).Warn("list all doc failed")
		return err
	}

	if len(docs) == 0 {
		logger.Info("empty docs, skip update")
		return nil
	}

	for _, doc := range docs {
		err := d.rag.UpdateDocumentMetadata(ctx, d.dataset.GetBackendID(ctx), doc.RagID, doc.Metadata())
		if err != nil {
			logger.WithErr(err).With("doc_id", doc.ID).With("rag_id", doc.RagID).Warn("upsert rag records failed")
			return err
		}
	}

	return nil
}
