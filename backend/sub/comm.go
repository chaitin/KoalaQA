package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/batch"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type Comment struct {
	logger  *glog.Logger
	llm     *svc.LLM
	bot     *svc.Bot
	trend   *svc.Trend
	disc    *svc.Discussion
	forum   *svc.Forum
	pub     mq.Publisher
	rag     rag.Service
	stat    *repo.Stat
	batcher batch.Batcher[model.StatInfo]
}

func NewComment(disc *svc.Discussion, bot *svc.Bot, llm *svc.LLM, batcher batch.Batcher[model.StatInfo],
	pub mq.Publisher, rag rag.Service, forum *svc.Forum, trend *svc.Trend, stat *repo.Stat) *Comment {
	return &Comment{
		llm:     llm,
		logger:  glog.Module("sub.comment"),
		disc:    disc,
		bot:     bot,
		trend:   trend,
		pub:     pub,
		rag:     rag,
		forum:   forum,
		stat:    stat,
		batcher: batcher,
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

	forum, err := d.forum.GetByID(ctx, disc.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}
	ragContent, err := d.llm.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("generate content for retrieval failed")
		return nil
	}
	// record rag
	ragID, err := d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:  forum.DatasetID,
		DocumentID: disc.RagID,
		Content:    ragContent,
		Metadata:   disc.Metadata(),
	})
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
		logger.WithErr(err).Error("get bot failed")
		return nil
	}

	question, groups, prompt, err := d.llm.GenerateAnswerPrompt(ctx, data.DiscID, data.CommID)
	if err != nil {
		logger.WithErr(err).Error("generate prompt failed")
		return nil
	}
	llmRes, answered, err := d.llm.Answer(ctx, svc.GenerateReq{
		Question:      question,
		Groups:        groups,
		Prompt:        prompt,
		DefaultAnswer: bot.UnknownPrompt,
		NewCommentID:  data.CommID,
	})
	if err != nil {
		return err
	}

	if answered == disc.BotUnknown {
		err = d.disc.SetBotUnknown(ctx, disc.ID, !disc.BotUnknown)
		if err != nil {
			logger.WithErr(err).With("answered", answered).Warn("set bot unknown status failed")
		}
	}

	// ai 能够回答或者 ai 第一次无法回答的情况下创建ai回复
	if answered || (bot.UnknownPrompt != "" && !disc.BotUnknown) {
		newID, err := d.disc.CreateComment(ctx, bot.UserID, data.DiscUUID, svc.CommentCreateReq{
			Content:     llmRes,
			Bot:         true,
			BotAnswered: answered,
			CommentID:   data.CommID,
		})
		if err != nil {
			return err
		}

		logger.With("comment_id", newID).Debug("comment created")
	}

	if !answered && !disc.BotUnknown {
		logger.Info("ai not know the answer, notify admin")
		notifyMsg := topic.MsgMessageNotify{
			DiscussHeader: disc.Header(),
			Type:          model.MsgNotifyTypeBotUnknown,
			FromID:        comment.UserID,
			ToID:          bot.UserID,
		}
		d.pub.Publish(ctx, topic.TopicMessageNotify, notifyMsg)
		d.batcher.Send(model.StatInfo{
			Type: model.StatTypeBotUnknownComment,
			Ts:   util.HourTrunc(disc.CreatedAt.Time()).Unix(),
			Key:  disc.UUID,
		})
	}
	return nil
}

func (d *Comment) handleUpdate(ctx context.Context, data topic.MsgCommentChange) error {
	logger := d.logger.WithContext(ctx).With("comment_id", data.CommID)
	logger.Info("handle update comment")
	ragContent, err := d.llm.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	forum, err := d.forum.GetByID(ctx, data.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}
	disc, err := d.disc.GetByID(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("get discussion failed")
		return nil
	}
	ragID, err := d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:  forum.DatasetID,
		DocumentID: disc.RagID,
		Content:    ragContent,
		Metadata:   disc.Metadata(),
	})
	if err != nil {
		logger.WithErr(err).Error("update rag failed")
		return nil
	}
	err = d.disc.UpdateRagID(ctx, data.DiscID, ragID)
	if err != nil {
		logger.WithErr(err).Error("update discussion rag failed")
		return nil
	}
	return nil
}

func (d *Comment) handleDelete(ctx context.Context, data topic.MsgCommentChange) error {
	logger := d.logger.WithContext(ctx).With("comment_id", data.CommID)
	logger.Info("handle delete comment")
	ragContent, err := d.llm.GenerateContentForRetrieval(ctx, data.DiscID)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	forum, err := d.forum.GetByID(ctx, data.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}
	disc, err := d.disc.GetByID(ctx, data.DiscID)
	if err != nil {
		logger.WithErr(err).Error("get discussion failed")
		return nil
	}
	ragID, err := d.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID:  forum.DatasetID,
		DocumentID: disc.RagID,
		Content:    ragContent,
		Metadata:   disc.Metadata(),
	})
	if err != nil {
		logger.WithErr(err).Error("update rag failed")
		return nil
	}
	err = d.disc.UpdateRagID(ctx, data.DiscID, ragID)
	if err != nil {
		logger.WithErr(err).Error("update discussion rag failed")
		return nil
	}
	return nil
}
