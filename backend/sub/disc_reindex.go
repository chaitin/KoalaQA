package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type DiscReindex struct {
	disc   *svc.Discussion
	prompt *svc.Prompt
	forum  *svc.Forum
	rag    rag.Service
	logger *glog.Logger
}

func NewDiscReindex(disc *svc.Discussion, prompt *svc.Prompt, forum *svc.Forum, rag rag.Service) *DiscReindex {
	return &DiscReindex{
		disc:   disc,
		prompt: prompt,
		forum:  forum,
		rag:    rag,
		logger: glog.Module("sub.discussion.reindex"),
	}
}

func (d *DiscReindex) MsgType() mq.Message {
	return topic.MsgDiscReindex{}
}

func (d *DiscReindex) Topic() mq.Topic {
	return topic.TopicDiscReindex
}

func (d *DiscReindex) Group() string {
	return "koala_discussion_reindex"
}

func (d *DiscReindex) AckWait() time.Duration {
	return time.Minute * 2
}

func (d *DiscReindex) Concurrent() uint {
	return 5
}

func (d *DiscReindex) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscReindex)
	logger := d.logger.WithContext(ctx).With("disc_id", data.DiscID)
	logger.Debug("handle discussion reindex")

	ragContent, err := d.prompt.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("generate content for retrieval failed")
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
		Content:    ragContent,
		Metadata: rag.Metadata{
			DiscMetadata: disc.Metadata(),
		},
	})
	if err != nil {
		return err
	}

	if err := d.disc.UpdateRagID(ctx, data.DiscID, ragID); err != nil {
		return err
	}

	return nil
}
