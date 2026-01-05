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

type Blog struct {
	disc   *repo.Discussion
	trend  *svc.Trend
	logger *glog.Logger
	llm    *svc.LLM
	prompt *svc.Prompt
}

func NewBlog(disc *repo.Discussion, llm *svc.LLM, prompt *svc.Prompt, trend *svc.Trend) *Blog {
	return &Blog{
		disc:   disc,
		trend:  trend,
		llm:    llm,
		prompt: prompt,
		logger: glog.Module("sub", "blog"),
	}
}

func (a *Blog) MsgType() mq.Message {
	return topic.MsgDiscChange{}
}

func (a *Blog) Topic() mq.Topic {
	return topic.TopicDiscChange
}

func (a *Blog) Group() string {
	return "koala_article_change"
}

func (a *Blog) AckWait() time.Duration {
	return time.Minute * 5
}

func (a *Blog) Concurrent() uint {
	return 10
}

func (a *Blog) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscChange)

	switch data.Type {
	case model.DiscussionTypeQA, model.DiscussionTypeBlog, model.DiscussionTypeIssue:
	default:
		a.logger.WithContext(ctx).With("data", data).Debug("ignore disc summary update")
		return nil
	}

	switch data.OP {
	case topic.OPInsert, topic.OPUpdate:
		return a.handleInsert(ctx, data)
	}
	return nil
}

func (a *Blog) handleInsert(ctx context.Context, data topic.MsgDiscChange) error {
	logger := a.logger.WithContext(ctx).With("disc_uuid", data.DiscUUID).With("type", data.Type)
	logger.Info("handle insert blog")

	if data.Type == model.DiscussionTypeBlog {
		disc, err := a.disc.GetByUUID(ctx, data.DiscUUID)
		if err != nil {
			logger.WithErr(err).Error("get disc failed")
			return nil
		}

		if disc.Summary != "" {
			logger.Info("blog already have summary, skip")
			return nil
		}
	}

	_, prompt, _, err := a.prompt.GeneratePostPrompt(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("generate post prompt failed")
		return nil
	}
	summary, err := a.llm.Chat(ctx, llm.SystemBlogSummaryPrompt, prompt, map[string]any{
		"CurrentDate": time.Now().Format("2006-01-02"),
	})
	if err != nil {
		logger.WithErr(err).Error("chat failed")
		return err
	}
	err = a.disc.Update(ctx, map[string]any{"summary": summary}, repo.QueryWithEqual("id", data.DiscID))
	if err != nil {
		logger.WithErr(err).Error("update discussion failed")
		return err
	}
	logger.Info("update discussion summary success")
	return nil
}
