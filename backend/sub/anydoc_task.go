package sub

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/cache"
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
	cache   cache.Cache[topic.TaskMeta]
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
	meta, ok := t.cache.Get(taskInfo.TaskID)
	if !ok {
		logger.Warn("task timeout")
		return nil
	}
	meta.TaskHead = taskInfo.TaskHead

	defer func() {
		t.cache.Set(taskInfo.TaskID, meta)
	}()

	switch meta.Status {
	case topic.TaskStatusCompleted:
		if meta.ParentID > 0 {
			exist, err := t.repoDoc.ExistByID(ctx, meta.ParentID)
			if err != nil {
				logger.WithErr(err).With("parent_id", meta.ParentID).Warn("get parent doc failed")
				return nil
			}

			if !exist {
				logger.With("parent_id", meta.ParentID).Info("parent doc not eixst, skip")
				return nil
			}

			// 避免入库相同的数据
			if meta.DBDocID == 0 {
				exist, err = t.repoDoc.Exist(ctx,
					repo.QueryWithEqual("parent_id", meta.ParentID),
					repo.QueryWithEqual("doc_id", meta.DocID),
				)
				if err != nil {
					logger.WithErr(err).With("parent_id", meta.ParentID).With("doc_id", meta.DocID).Warn("query doc doc failed")
					return nil
				}

				if exist {
					logger.With("parent_id", meta.ParentID).With("doc_id", meta.DocID).Info("doc already exist, skip")
					return nil
				}
			}
		}

		var (
			markdownPath string
			jsonPath     string
		)

		if meta.DBDocID > 0 {
			var dbDoc model.KBDocument
			err := t.repoDoc.GetByID(ctx, &dbDoc, meta.KBID, meta.DBDocID)
			if err != nil {
				logger.WithErr(err).With("doc_id", meta.DBDocID).Warn("get db doc failed")
			} else {
				markdownPath = string(dbDoc.Markdown)
				jsonPath = string(dbDoc.JSON)
			}
		}

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
			Status:      model.DocStatusUnknown,
			ParentID:    meta.ParentID,
		}

		err := t.repoDoc.CreateOnIDConflict(ctx, &doc)
		if err != nil {
			meta.Status = topic.TaskStatusFailed
			logger.WithErr(err).With("kb_document", doc).Error("create kb_document failed")
			return nil
		}

		if markdownPath != "" && markdownPath != string(doc.Markdown) {
			err = t.oc.Delete(ctx, markdownPath, oss.WithBucket("anydoc"))
			if err != nil {
				logger.WithErr(err).With("dir", markdownPath).Warn("remove oss object failed")
			}
		}

		if jsonPath != "" && jsonPath != string(doc.JSON) {
			err = t.oc.Delete(ctx, jsonPath, oss.WithBucket("anydoc"))
			if err != nil {
				logger.WithErr(err).With("dir", jsonPath).Warn("remove oss object failed")
			}
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
			logger.WithErr(err).With("pub_msg", pubMsg).Error("pub msg failed")
			return nil
		}

	case topic.TaskStatusFailed:
		logger.Warn("doc export task failed")
	case topic.TaskStatusInProgress, topic.TaskStatusPending:
		return nil
	default:
		logger.Warn("task status not support")
	}

	return nil
}

func newAnydocTask(c cache.Cache[topic.TaskMeta], repoDoc *repo.KBDocument, pub mq.Publisher, oc oss.Client) *anydocTask {
	return &anydocTask{
		oc:      oc,
		pub:     pub,
		repoDoc: repoDoc,
		cache:   c,
		logger:  glog.Module("sub", "anydoc"),
	}
}

func newCache() cache.Cache[topic.TaskMeta] {
	return cache.New[topic.TaskMeta](time.Hour * 12)
}
