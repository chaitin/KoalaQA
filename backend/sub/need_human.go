package sub

import (
	"context"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type NeedHuman struct {
	logger *glog.Logger
	llm    *svc.LLM
	disc   *svc.Discussion
	pub    mq.Publisher
}

func newNeedHuman(disc *svc.Discussion, llm *svc.LLM, pub mq.Publisher) *NeedHuman {
	return &NeedHuman{
		llm:    llm,
		logger: glog.Module("sub.manual_comment"),
		disc:   disc,
		pub:    pub,
	}
}

func (c *NeedHuman) MsgType() mq.Message {
	return topic.MsgCommentChange{}
}

func (c *NeedHuman) Topic() mq.Topic {
	return topic.TopicCommentChange
}

func (c *NeedHuman) Group() string {
	return "koala_manual_comment_change"
}

func (d *NeedHuman) AckWait() time.Duration {
	return time.Minute * 5
}

func (d *NeedHuman) Concurrent() uint {
	return 4
}

func (d *NeedHuman) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgCommentChange)

	logger := d.logger.WithContext(ctx).With("msg", data)

	if data.OP != topic.OPInsert {
		logger.Debug("msg is not insert, skip")
		return nil
	}

	comment, err := d.disc.GetCommentByID(ctx, data.CommID)
	if err != nil {
		logger.WithErr(err).Warn("get comment failed")
		return nil
	}

	if comment.ParentID == 0 || comment.Bot {
		logger.Debug("msg is answer or bot, skip")
		return nil
	}

	parentComment, err := d.disc.GetCommentByID(ctx, comment.ParentID)
	if err != nil {
		logger.WithErr(err).With("id", comment.ParentID).Warn("get parent comment failed")
		return nil
	}

	if !parentComment.Bot {
		logger.Debug("parent comment is not bot, skip")
		return nil
	}

	aiRes, err := d.llm.Chat(ctx, llm.NeedHumanPrompt, "", map[string]any{
		"Data": comment.Content,
	})
	if err != nil {
		logger.WithErr(err).Warn("ai need human failed")
		return nil
	}

	needHum, _ := strconv.ParseBool(aiRes)

	if !needHum {
		logger.With("content", comment.Content).Debug("no need human, skip")
		return nil
	}

	disc, err := d.disc.GetByID(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Warn("get discussion failed")
		return nil
	}

	d.pub.Publish(ctx, topic.TopicMessageNotify, topic.MsgMessageNotify{
		ForumID:        disc.ForumID,
		DiscussID:      disc.ID,
		DiscussUUID:    disc.UUID,
		DiscussTitle:   disc.Title,
		DiscussionType: disc.Type,
		ParentID:       comment.ParentID,
		CommentID:      comment.ID,
		Type:           model.MsgNotifyTypeBotUnknown,
		FromID:         comment.UserID,
		ToID:           parentComment.UserID,
	})

	return nil
}
