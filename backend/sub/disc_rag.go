package sub

import (
	"context"
	"fmt"
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
}

func NewDiscRag(disc *svc.Discussion, dataset *repo.Dataset, rag rag.Service) *DiscRag {
	return &DiscRag{
		disc:    disc,
		dataset: dataset,
		rag:     rag,
		logger:  glog.Module("sub.discussion.rag"),
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
	case topic.OPInsert:
		return d.handleInsert(ctx, data.DiscID)
	case topic.OPUpdate:
		return d.handleUpdate(ctx, data.DiscID, data.RagID)
	case topic.OPDelete:
		return d.handleDelete(ctx, data.RagID)
	}
	return nil

}

func (d *DiscRag) handleInsert(ctx context.Context, discID uint) error {
	logger := d.logger.WithContext(ctx).With("disc_id", discID)
	logger.Debug("handle insert discussion rag")
	disc, err := d.disc.GetByID(ctx, discID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("get discussion failed")
		return nil
	}
	content := fmt.Sprintf(`帖子标题：%s\n帖子内容：%s`, disc.Title, disc.Content)
	ragID, err := d.rag.UpsertRecords(ctx, d.dataset.GetFrontendID(ctx), content, nil)
	if err != nil {
		return err
	}
	err = d.disc.UpdateRagID(ctx, discID, ragID)
	if err != nil {
		return err
	}
	return nil
}

func (d *DiscRag) handleUpdate(ctx context.Context, discID uint, ragID string) error {
	if err := d.rag.DeleteRecords(ctx, d.dataset.GetFrontendID(ctx), []string{ragID}); err != nil {
		return err
	}
	return d.handleInsert(ctx, discID)
}

func (d *DiscRag) handleDelete(ctx context.Context, ragID string) error {
	if err := d.rag.DeleteRecords(ctx, d.dataset.GetFrontendID(ctx), []string{ragID}); err != nil {
		return err
	}
	return nil
}
