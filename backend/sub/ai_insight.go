package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type aiInsightIn struct {
	fx.In

	RepoAIInsight *repo.AIInsight
}

type AIInsight struct {
	in aiInsightIn

	logger *glog.Logger
}

func newAIInsight(in aiInsightIn) *AIInsight {
	return &AIInsight{in: in, logger: glog.Module("sub", "ai_insight")}
}

func (i *AIInsight) MsgType() mq.Message {
	return topic.MsgAIInsight{}
}

func (i *AIInsight) Topic() mq.Topic {
	return topic.TopicAIInsight
}

func (i *AIInsight) Group() string {
	return "koala_ai_insight"
}

func (i *AIInsight) AckWait() time.Duration {
	return time.Minute * 5
}

func (i *AIInsight) Concurrent() uint {
	return 1
}

func (i *AIInsight) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgAIInsight)
	logger := i.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive ai insight msg")

	err := i.in.RepoAIInsight.Create(ctx, &model.AIInsight{
		ForumID: data.ForumID,
		Keyword: data.Keyword,
	})
	if err != nil {
		logger.WithErr(err).Warn("create ai_insight failed")
		return err
	}

	return nil
}
