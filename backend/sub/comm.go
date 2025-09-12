package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type Comment struct {
	logger *glog.Logger
	llm    *svc.LLM
	bot    *svc.Bot
	disc   *svc.Discussion
}

func NewComment(disc *svc.Discussion, bot *svc.Bot, llm *svc.LLM) *Comment {
	return &Comment{
		llm:    llm,
		logger: glog.Module("sub.comment"),
		disc:   disc,
		bot:    bot,
	}
}

func (c *Comment) MsgType() mq.Message {
	return topic.MsgCommentChange{}
}

func (c *Comment) Topic() mq.Topic {
	return topic.TopicCommentChange
}

func (c *Comment) Group() string {
	return "koala_comment_change"
}

func (d *Comment) AckWait() time.Duration {
	return time.Minute * 5
}

func (d *Comment) Concurrent() uint {
	return 10
}

func (d *Comment) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgCommentChange)
	switch data.OP {
	case topic.OPInsert:
		return d.handleInsert(ctx, data)
	case topic.OPUpdate:
		return d.handleUpdate(ctx, data)
	case topic.OPDelete:
		return d.handleDelete(ctx, data)
	}
	return nil
}

func (d *Comment) handleInsert(ctx context.Context, data topic.MsgCommentChange) error {
	logger := d.logger.WithContext(ctx).With("comment_id", data.CommID)
	logger.Debug("handle insert comment")
	bot, err := d.bot.Get(ctx)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("get bot failed")
		return nil
	}
	prompt, err := d.llm.GenerateChatPrompt(ctx, data.DiscID, data.CommID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	llmRes, answered, err := d.llm.Chat(ctx, svc.GenerateReq{
		Question:      prompt,
		DefaultAnswer: bot.UnknownPrompt,
	})
	if err != nil {
		return err
	}
	newID, err := d.disc.CreateComment(ctx, bot.UserID, data.DiscUUID, svc.CommentCreateReq{
		Content:   llmRes,
		Bot:       true,
		CommentID: data.CommID,
	})
	if err != nil {
		return err
	}
	if !answered {
		logger.Debug("llm not know the answer")
	}
	logger.WithContext(ctx).With("comment_id", newID).Debug("comment created")
	return nil
}

func (d *Comment) handleUpdate(ctx context.Context, data topic.MsgCommentChange) error {
	d.logger.WithContext(ctx).With("comment_id", data.CommID).Info("handle update comment")
	return nil
}

func (d *Comment) handleDelete(ctx context.Context, data topic.MsgCommentChange) error {
	d.logger.WithContext(ctx).With("comment_id", data.CommID).Info("handle delete comment")
	return nil
}
