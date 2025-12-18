package sub

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type anydocTask struct {
	oc      oss.Client
	pub     mq.Publisher
	repoDoc *repo.KBDocument
	logger  *glog.Logger
}

func (t *anydocTask) Topic() mq.Topic {
	return topic.AnydocTaskExportTopic
}

func (t *anydocTask) Group() string {
	return "koala_persistence_anydoc_task_export"
}

func (t *anydocTask) MsgType() mq.Message {
	return topic.TaskInfo{}
}

func (t *anydocTask) AckWait() time.Duration {
	return time.Minute * 1
}

func (t *anydocTask) Concurrent() uint {
	return 1
}

func (t *anydocTask) Handle(ctx context.Context, msg mq.Message) error {
	taskInfo := msg.(topic.TaskInfo)
	logger := t.logger.WithContext(ctx).With("task_info", taskInfo)

	logger.Debug("receive task result")
	dbDoc, err := t.repoDoc.GetByTaskID(ctx, taskInfo.TaskID)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return nil
		}

		logger.WithErr(err).Warn("get doc by task id failed")
		return err
	}

	switch taskInfo.Status {
	case topic.TaskStatusCompleted:
		err = t.repoDoc.Update(ctx, map[string]any{
			"status":       model.DocStatusExportSuccess,
			"message":      "",
			"platform_opt": model.NewJSONB(taskInfo.PlatformOpt),
			"file_type":    taskInfo.DocType,
			"markdown":     []byte(taskInfo.Markdown),
			"json":         []byte(taskInfo.JSON),
		}, repo.QueryWithEqual("id", dbDoc.ID))
		if err != nil {
			logger.WithErr(err).With("doc_id", dbDoc.ID).Error("update kb_document failed")
			return err
		}

		markdownPath := string(dbDoc.Markdown)
		jsonPath := string(dbDoc.JSON)

		if markdownPath != "" && markdownPath != taskInfo.Markdown {
			err = t.oc.Delete(ctx, markdownPath, oss.WithBucket("anydoc"))
			if err != nil {
				logger.WithErr(err).With("dir", markdownPath).Warn("remove oss object failed")
			}
		}

		if jsonPath != "" && jsonPath != taskInfo.JSON {
			err = t.oc.Delete(ctx, jsonPath, oss.WithBucket("anydoc"))
			if err != nil {
				logger.WithErr(err).With("dir", jsonPath).Warn("remove oss object failed")
			}
		}

		op := topic.OPInsert
		if dbDoc.RagID != "" {
			op = topic.OPUpdate
		}

		pubMsg := topic.MsgKBDocument{
			OP:    op,
			KBID:  dbDoc.KBID,
			DocID: dbDoc.ID,
		}
		err = t.pub.Publish(ctx, topic.TopicKBDocumentRag, pubMsg)
		if err != nil {
			logger.WithErr(err).With("pub_msg", pubMsg).Error("pub msg failed")
			return err
		}

	case topic.TaskStatusFailed:
		logger.Warn("doc export task failed")

		err = t.repoDoc.Update(ctx, map[string]any{
			"status":       model.DocStatusExportSuccess,
			"message":      taskInfo.Err,
			"platform_opt": model.NewJSONB(taskInfo.PlatformOpt),
			"file_type":    taskInfo.DocType,
		}, repo.QueryWithEqual("id", dbDoc.ID))
		if err != nil {
			logger.WithErr(err).With("doc_id", dbDoc.ID).Warn("create kb_document failed")
			return err
		}

	case topic.TaskStatusInProgress, topic.TaskStatusPending:
		return nil
	default:
		logger.Warn("task status not support")
	}

	return nil
}

func newAnydocTask(repoDoc *repo.KBDocument, pub mq.Publisher, oc oss.Client) *anydocTask {
	return &anydocTask{
		oc:      oc,
		pub:     pub,
		repoDoc: repoDoc,
		logger:  glog.Module("sub", "anydoc"),
	}
}
