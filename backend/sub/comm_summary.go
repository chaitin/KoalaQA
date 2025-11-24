package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type CommentSummary struct {
	logger *glog.Logger
	disc   *repo.Discussion
	llm    *svc.LLM
}

func NewCommentSummary(disc *repo.Discussion, llm *svc.LLM) *CommentSummary {
	return &CommentSummary{
		llm:    llm,
		disc:   disc,
		logger: glog.Module("sub", "comment_summary"),
	}
}

func (c *CommentSummary) MsgType() mq.Message {
	return topic.MsgCommentChange{}
}

func (c *CommentSummary) Topic() mq.Topic {
	return topic.TopicCommentChange
}

func (c *CommentSummary) Group() string {
	return "koala_comment_change_summary"
}

func (c *CommentSummary) AckWait() time.Duration {
	return time.Minute * 5
}

func (c *CommentSummary) Concurrent() uint {
	return 2
}

func (c *CommentSummary) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgCommentChange)
	logger := c.logger.WithContext(ctx).With("msg", data)
	logger.Debug("recv comment change")

	var disc model.Discussion
	err := c.disc.GetByID(ctx, &disc, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("get disc failed")
		return nil
	}

	if disc.Type != model.DiscussionTypeQA {
		logger.Debug("ignore comment update")
		return nil
	}

	_, prompt, err := c.llm.GeneratePostPrompt(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("generate post prompt failed")
		return nil
	}
	summary, err := c.llm.Chat(ctx, llm.SystemBlogSummaryPrompt, prompt, map[string]any{
		"CurrentDate": time.Now().Format("2006-01-02"),
	})
	if err != nil {
		logger.WithErr(err).Error("chat failed")
		return nil
	}
	err = c.disc.Update(ctx, map[string]any{
		"summary": summary,
	}, repo.QueryWithEqual("id", data.DiscID))
	if err != nil {
		logger.WithErr(err).Error("update discussion summary failed")
		return nil
	}
	logger.Debug("update summary done")

	return nil
}
