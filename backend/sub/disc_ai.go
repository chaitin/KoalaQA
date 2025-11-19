package sub

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/batch"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/svc"
)

type Disc struct {
	disc    *svc.Discussion
	trend   *svc.Trend
	logger  *glog.Logger
	llm     *svc.LLM
	bot     *svc.Bot
	pub     mq.Publisher
	batcher batch.Batcher[model.StatInfo]
}

func NewDisc(disc *svc.Discussion, llm *svc.LLM, bot *svc.Bot, pub mq.Publisher, trend *svc.Trend, batcher batch.Batcher[model.StatInfo]) *Disc {
	return &Disc{
		disc:    disc,
		trend:   trend,
		llm:     llm,
		bot:     bot,
		pub:     pub,
		batcher: batcher,
		logger:  glog.Module("sub.discussion.change"),
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
	if data.Type != model.DiscussionTypeQA {
		d.logger.WithContext(ctx).
			With("disc_uuid", data.DiscUUID).
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
		logger.WithErr(err).Error("get bot failed")
		return nil
	}
	question, prompt, err := d.llm.GenerateChatPrompt(ctx, data.DiscID, 0)
	if err != nil {
		logger.WithErr(err).Error("generate prompt failed")
		return nil
	}
	llmRes, answered, err := d.llm.Answer(ctx, svc.GenerateReq{
		Question:      question,
		Prompt:        prompt,
		DefaultAnswer: bot.UnknownPrompt,
		NewCommentID:  0,
	})
	if err != nil {
		logger.WithErr(err).Error("answer failed")
		return err
	}
	if !answered {
		metadata := mq.MessageMetadata(ctx)
		// first delivery, retry later
		if metadata.NumDelivered == 1 {
			return errors.New("ai not know the answer, retry later")
		}
	}
	if answered || bot.UnknownPrompt != "" {
		commentID, err := d.disc.CreateComment(ctx, bot.UserID, data.DiscUUID, svc.CommentCreateReq{
			Content:   llmRes,
			CommentID: 0,
			Bot:       true,
		})
		if err != nil {
			logger.WithErr(err).Error("create comment failed")
			return err
		}
		logger.With("comment_id", commentID).With("content", llmRes).Info("comment created")
	}

	if !answered {
		logger.Info("ai not know the answer, notify admin")
		d.batcher.Send(model.StatInfo{
			Type: model.StatTypeBotUnknown,
			Ts:   util.HourTrunc(time.Now()).Unix(),
			Key:  data.DiscUUID,
		})
		disc, err := d.disc.GetByID(ctx, data.DiscID)
		if err != nil {
			logger.WithErr(err).Error("get discussion failed")
			return nil
		}
		notifyMsg := topic.MsgMessageNotify{
			DiscussHeader: disc.Header(),
			Type:          model.MsgNotifyTypeBotUnknown,
			FromID:        disc.UserID,
			ToID:          bot.UserID,
		}
		d.pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	}
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
