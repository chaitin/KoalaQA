package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type Comment struct {
	logger *glog.Logger
	llm    *svc.LLM
	bot    *svc.Bot
	trend  *svc.Trend
	disc   *svc.Discussion
	forum  *svc.Forum
	pub    mq.Publisher
	rag    rag.Service
}

func NewComment(disc *svc.Discussion, bot *svc.Bot, llm *svc.LLM, pub mq.Publisher, rag rag.Service, forum *svc.Forum, trend *svc.Trend) *Comment {
	return &Comment{
		llm:    llm,
		logger: glog.Module("sub.comment"),
		disc:   disc,
		bot:    bot,
		trend:  trend,
		pub:    pub,
		rag:    rag,
		forum:  forum,
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

	disc, err := d.disc.GetByID(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Warn("get discussion failed")
		return nil
	}

	comment, err := d.disc.GetCommentByID(ctx, data.CommID)
	if err != nil {
		logger.WithErr(err).Warn("get comment failed")
		return nil
	}

	go func() {
		if disc.Type != model.DiscussionTypeQA || comment.ParentID == 0 {
			d.disc.IncrementComment(disc.UUID, !data.NotUpdateDisc)
		}
	}()

	question, prompt, err := d.llm.GenerateChatPrompt(ctx, data.DiscID, data.CommID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}

	forum, err := d.forum.GetByID(ctx, disc.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}

	// record rag
	ragID, err := d.rag.UpsertRecords(ctx, forum.DatasetID, disc.RagID, prompt, nil)
	if err != nil {
		return err
	}
	err = d.disc.UpdateRagID(ctx, data.DiscID, ragID)
	if err != nil {
		return err
	}

	// ai answer
	if comment.Bot {
		logger.Debug("comment is bot, skip")
		return nil
	}
	if comment.ParentID == 0 {
		logger.Debug("comment is the root comment, skip")
		return nil
	}
	parentComment, err := d.disc.GetCommentByID(ctx, comment.ParentID)
	if err != nil {
		logger.WithErr(err).Warn("get parent comment failed")
		return nil
	}
	if !parentComment.Bot {
		logger.Debug("parent comment is not bot, skip")
		return nil
	}
	bot, err := d.bot.Get(ctx)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("get bot failed")
		return nil
	}
	llmRes, answered, err := d.llm.Answer(ctx, svc.GenerateReq{
		Question:      question,
		Prompt:        prompt,
		DefaultAnswer: bot.UnknownPrompt,
	})
	if err != nil {
		return err
	}
	if answered || bot.UnknownPrompt != "" {
		newID, err := d.disc.CreateComment(ctx, bot.UserID, data.DiscUUID, svc.CommentCreateReq{
			Content:   llmRes,
			Bot:       true,
			CommentID: data.CommID,
		})
		if err != nil {
			return err
		}

		logger.WithContext(ctx).With("comment_id", newID).Debug("comment created")
	}

	if !answered {
		logger.Info("ai not know the answer, notify admin")
		notifyMsg := topic.MsgMessageNotify{
			DiscussID:      disc.ID,
			ForumID:        forum.ID,
			DiscussionType: disc.Type,
			DiscussTitle:   disc.Title,
			DiscussUUID:    disc.UUID,
			Type:           model.MsgNotifyTypeBotUnknown,
			FromID:         comment.UserID,
			ToID:           bot.UserID,
		}
		d.pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
	}
	return nil
}

func (d *Comment) handleUpdate(ctx context.Context, data topic.MsgCommentChange) error {
	d.logger.WithContext(ctx).With("comment_id", data.CommID).Info("handle update comment")
	return nil
}

func (d *Comment) handleDelete(ctx context.Context, data topic.MsgCommentChange) error {
	go d.disc.DecrementComment(data.DiscUUID)
	d.logger.WithContext(ctx).With("comment_id", data.CommID).Info("handle delete comment")
	return nil
}
