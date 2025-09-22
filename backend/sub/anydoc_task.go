package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type anydocTask struct {
	pub     mq.Publisher
	repoDoc *repo.KBDocument
	cache   cache.Cache[topic.TaskMeta]
	logger  *glog.Logger
}

func (t *anydocTask) Topic() mq.Topic {
	return topic.AnydocTaskExportTopic
}

func (t *anydocTask) Group() string {
	return "koala_anydoc_task_export"
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

	t.logger.WithContext(ctx).With("task_info", taskInfo).Debug("receive task result")
	meta, ok := t.cache.Get(taskInfo.TaskID)
	if !ok {
		t.logger.WithContext(ctx).With("task_info", taskInfo).Warn("task timeout")
		return nil
	}
	meta.TaskHead = taskInfo.TaskHead

	defer func() {
		t.cache.Set(taskInfo.TaskID, meta)
	}()

	switch meta.Status {
	case topic.TaskStatusCompleted:
		doc := model.KBDocument{
			Base: model.Base{
				ID: meta.DBDocID,
			},
			KBID:        meta.KBID,
			Platform:    meta.Platform,
			DocType:     meta.DocType,
			PlatformOpt: model.NewJSONB(taskInfo.PlatformOpt),
			ExportOpt:   model.NewJSONB(meta.ExportOpt),
			DocID:       taskInfo.DocID,
			Title:       meta.Title,
			Desc:        meta.Desc,
			Markdown:    []byte(taskInfo.Markdown),
			JSON:        []byte(taskInfo.JSON),
			FileType:    taskInfo.DocType,
			Status:      model.DocStatusAppling,
			ParentID:    meta.ParentID,
		}

		err := t.repoDoc.CreateOnIDConflict(ctx, &doc)
		if err != nil {
			meta.Status = topic.TaskStatusFailed
			t.logger.WithContext(ctx).WithErr(err).With("kb_document", doc).Error("create kb_document failed")
			return nil
		}

		op := topic.OPInsert
		if meta.DBDocID > 0 {
			op = topic.OPUpdate
		}

		pubMsg := topic.MsgKBDocument{
			OP:    op,
			KBID:  meta.KBID,
			DocID: doc.ID,
		}
		err = t.pub.Publish(ctx, topic.TopicKBDocumentRag, pubMsg)
		if err != nil {
			t.logger.WithContext(ctx).WithErr(err).With("pub_msg", pubMsg).Error("pub msg failed")
			return nil
		}

	case topic.TaskStatusFailed:
		t.logger.WithContext(ctx).With("task_info", taskInfo).Warn("doc export task failed")
	case topic.TaskStatusInProgress, topic.TaskStatusPending:
		return nil
	default:
		t.logger.WithContext(ctx).With("task_info", taskInfo).Warn("task status not support")
	}

	return nil
}

func newAnydocTask(c cache.Cache[topic.TaskMeta], repoDoc *repo.KBDocument, pub mq.Publisher) *anydocTask {
	return &anydocTask{
		pub:     pub,
		repoDoc: repoDoc,
		cache:   c,
		logger:  glog.Module("sub", "anydoc"),
	}
}

func newCache() cache.Cache[topic.TaskMeta] {
	return cache.New[topic.TaskMeta](time.Minute * 10)
}
