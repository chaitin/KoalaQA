package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type DiscRag struct {
	disc    *svc.Discussion
	dataset *repo.Dataset
	logger  *glog.Logger
	rag     rag.Service
	forum   *svc.Forum
	llm     *svc.LLM
}

func NewDiscRag(disc *svc.Discussion, dataset *repo.Dataset, rag rag.Service, forum *svc.Forum, llm *svc.LLM) *DiscRag {
	return &DiscRag{
		disc:    disc,
		dataset: dataset,
		rag:     rag,
		logger:  glog.Module("sub.discussion.rag"),
		forum:   forum,
		llm:     llm,
	}
}

func (d *DiscRag) MsgType() mq.Message {
	return topic.MsgDiscChange{}
}

func (d *DiscRag) Topic() mq.Topic {
	return topic.TopicDiscChange
}

func (d *DiscRag) Group() string {
	return "koala_discussion_change_rag"
}

func (d *DiscRag) AckWait() time.Duration {
	return time.Minute * 2
}

func (d *DiscRag) Concurrent() uint {
	return 10
}

func (d *DiscRag) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscChange)
	switch data.OP {
	case topic.OPInsert, topic.OPUpdate:
		return d.handleInsert(ctx, data)
	case topic.OPDelete:
		return d.handleDelete(ctx, data.ForumID, data.RagID)
	}
	return nil

}

func (d *DiscRag) handleInsert(ctx context.Context, data topic.MsgDiscChange) error {
	logger := d.logger.WithContext(ctx).With("data", data)
	logger.Debug("handle insert discussion rag")
	content, err := d.llm.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	forum, err := d.forum.GetByID(ctx, data.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}
	disc, err := d.disc.GetByID(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Warn("get disc failed")
		return nil
	}

	ragID, err := d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:  forum.DatasetID,
		DocumentID: data.RagID,
		Title:      disc.Title,
		Content:    content,
		Metadata:   disc.Metadata(),
	})
	if err != nil {
		return err
	}
	err = d.disc.UpdateRagID(ctx, data.DiscID, ragID)
	if err != nil {
		return err
	}
	content, err = d.llm.GenerateContentForRetrievalWithoutComments(ctx, data.DiscID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate content for retrieval without comments failed")
		return nil
	}
	_, err = d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:        forum.DatasetID,
		DocumentID:       ragID,
		Content:          content,
		Metadata:         disc.Metadata(),
		KeywordsOnlyMode: true,
	})
	if err != nil {
		return err
	}
	return nil
}

func (d *DiscRag) handleDelete(ctx context.Context, forumID uint, ragID string) error {
	forum, err := d.forum.GetByID(ctx, forumID)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).Error("get forum failed")
		return nil
	}
	if err := d.rag.DeleteRecords(ctx, forum.DatasetID, []string{ragID}); err != nil {
		return err
	}
	return nil
}
