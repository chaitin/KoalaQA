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
	prompt  *svc.Prompt
}

func NewDiscRag(disc *svc.Discussion, dataset *repo.Dataset, rag rag.Service, forum *svc.Forum, prompt *svc.Prompt) *DiscRag {
	return &DiscRag{
		disc:    disc,
		dataset: dataset,
		rag:     rag,
		logger:  glog.Module("sub.discussion.rag"),
		forum:   forum,
		prompt:  prompt,
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
	ragContent, err := d.prompt.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	forum, err := d.forum.GetByID(ctx, data.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}
	ragID, err := d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:  forum.DatasetID,
		DocumentID: data.RagID,
		Content:    ragContent,
	})
	if err != nil {
		return err
	}
	err = d.disc.UpdateRagID(ctx, data.DiscID, ragID)
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
