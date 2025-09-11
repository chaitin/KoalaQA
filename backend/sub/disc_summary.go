package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type DiscSummary struct {
	logger *glog.Logger
	llm    *svc.LLM
	disc   *repo.Discussion
}

func NewDiscSummary(llm *svc.LLM, disc *repo.Discussion) *DiscSummary {
	return &DiscSummary{
		llm:    llm,
		disc:   disc,
		logger: glog.Module("sub.discussion.summary"),
	}
}

func (d *DiscSummary) MsgType() mq.Message {
	return topic.MsgCommentChange{}
}

func (d *DiscSummary) Topic() mq.Topic {
	return topic.TopicCommentChange
}

func (d *DiscSummary) Group() string {
	return "koala_discussion_change_summary"
}

func (d *DiscSummary) AckWait() time.Duration {
	return time.Minute * 5
}

func (d *DiscSummary) Concurrent() uint {
	return 10
}

func (d *DiscSummary) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgCommentChange)
	switch data.OP {
	case topic.OPInsert, topic.OPUpdate:
		return d.handle(ctx, data.DiscID)
	}
	return nil

}

func (d *DiscSummary) handle(ctx context.Context, discID uint) error {
	logger := d.logger.WithContext(ctx).With("disc_id", discID)
	logger.Info("handle insert or update discussion comment")
	prompt, err := d.llm.GenerateSummaryPrompt(ctx, discID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	llmRes, answered, err := d.llm.Chat(ctx, svc.GenerateReq{
		Question:      prompt,
		SystemPrompt:  llm.SystemSummaryPrompt,
		DefaultAnswer: "当前帖子的信息不足以生成总结",
	})
	if err != nil {
		return err
	}
	if !answered {
		d.logger.Debug("llm not know the how to summary")
	}
	if err := d.disc.Update(ctx, map[string]any{"summary": llmRes}, repo.QueryWithEqual("id", discID)); err != nil {
		return err
	}
	d.logger.WithContext(ctx).With("disc_id", discID).With("summary", llmRes).Debug("summary updated")
	return nil
}
