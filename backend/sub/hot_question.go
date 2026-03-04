package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type HotQuestion struct {
	logger      *glog.Logger
	hotQuestion *repo.HotQuestion
	forum       *repo.Forum
}

func newHotQuestion(hotQuestion *repo.HotQuestion, forum *repo.Forum) *HotQuestion {
	return &HotQuestion{
		logger:      glog.Module("sub", "hot_question"),
		hotQuestion: hotQuestion,
		forum:       forum,
	}
}

func (h *HotQuestion) MsgType() mq.Message {
	return topic.MsgHotQuestion{}
}

func (h *HotQuestion) Topic() mq.Topic {
	return topic.TopicHotQuestion
}

func (h *HotQuestion) Group() string {
	return "koala_discussion_ai_insight_hot_question"
}

func (h *HotQuestion) AckWait() time.Duration {
	return time.Minute * 2
}

func (h *HotQuestion) Concurrent() uint {
	return 1
}

func (h *HotQuestion) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgHotQuestion)
	logger := h.logger.WithContext(ctx).With("msg", data)
	logger.Info("recv hot question msg")

	err := h.hotQuestion.Create(ctx, &model.HotQuestion{
		GroupID:        "",
		Content:        data.Content,
		DiscussionUUID: data.DiscUUID,
	})
	if err != nil {
		logger.WithErr(err).Error("create hot question failed")
		return err
	}

	return nil
}
