package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type Disc struct {
	disc   *svc.Discussion
	logger *glog.Logger
	llm    *svc.LLM
	bot    *svc.Bot
	pub    mq.Publisher
}

func NewDisc(disc *svc.Discussion, llm *svc.LLM, bot *svc.Bot, pub mq.Publisher) *Disc {
	return &Disc{
		disc:   disc,
		llm:    llm,
		bot:    bot,
		pub:    pub,
		logger: glog.Module("sub.discussion.change"),
	}
}

func (d *Disc) MsgType() mq.Message {
	return topic.MsgDiscChange{}
}

func (d *Disc) Topic() mq.Topic {
	return topic.TopicDiscChange
}

func (d *Disc) Group() string {
	return "koala_discussion_change"
}

func (d *Disc) AckWait() time.Duration {
	return time.Minute * 5
}

func (d *Disc) Concurrent() uint {
	return 10
}

func (d *Disc) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgDiscChange)
	if data.Type != string(model.DiscussionTypeQA) {
		d.logger.WithContext(ctx).
			With("disc_id", data.DiscID).
			With("type", data.Type).
			Debug("discussion type is not qa, skip")
		return nil
	}
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

func (d *Disc) handleInsert(ctx context.Context, data topic.MsgDiscChange) error {
	logger := d.logger.WithContext(ctx).With("disc_id", data.DiscID)
	logger.Info("handle insert discussion comment")
	bot, err := d.bot.Get(ctx)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("get bot failed")
		return nil
	}
	prompt, err := d.llm.GenerateChatPrompt(ctx, data.DiscID, 0)
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
	commentID, err := d.disc.CreateComment(ctx, bot.UserID, data.DiscUUID, svc.CommentCreateReq{
		Content:   llmRes,
		CommentID: 0,
		Bot:       true,
	})
	if err != nil {
		return err
	}
	if !answered {
		disc, err := d.disc.GetByID(ctx, data.DiscID)
		if err != nil {
			logger.WithErr(err).Warn("get discussion failed")
			return nil
		}
		notifyMsg := topic.MsgMessageNotify{
			DiscussID:    disc.ID,
			DiscussTitle: disc.Title,
			DiscussUUID:  disc.UUID,
			Type:         model.MsgNotifyTypeBotUnknown,
			FromID:       disc.UserID,
			ToID:         bot.UserID,
		}
		d.pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	}
	d.logger.WithContext(ctx).With("disc_id", data.DiscID).With("comment_id", commentID).Debug("comment created")
	return nil
}

func (d *Disc) handleUpdate(ctx context.Context, data topic.MsgDiscChange) error {
	d.logger.WithContext(ctx).With("disc_id", data.DiscID).Debug("handle update discussion doc")
	return nil
}

func (d *Disc) handleDelete(ctx context.Context, data topic.MsgDiscChange) error {
	d.logger.WithContext(ctx).With("disc_id", data.DiscID).Debug("handle delete discussion doc")
	return nil
}
