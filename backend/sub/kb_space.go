package sub

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type kbSpace struct {
	logger  *glog.Logger
	doc     *svc.KBDocument
	repoDoc *repo.KBDocument
	anydoc  anydoc.Anydoc
	cache   cache.Cache[topic.TaskMeta]
	pub     mq.Publisher

	running map[uint]bool
	lock    sync.Mutex
}

func (k *kbSpace) run(id uint) bool {
	k.lock.Lock()
	defer k.lock.Unlock()

	if k.running[id] {
		return false
	}

	k.running[id] = true

	return true
}

func (k *kbSpace) done(id uint) {
	k.lock.Lock()
	defer k.lock.Unlock()

	delete(k.running, id)
}

func newKBSpace(doc *svc.KBDocument, anydoc anydoc.Anydoc, cache cache.Cache[topic.TaskMeta], pub mq.Publisher, repoDoc *repo.KBDocument) *kbSpace {
	return &kbSpace{
		logger:  glog.Module("sub", "kb_space"),
		doc:     doc,
		anydoc:  anydoc,
		cache:   cache,
		pub:     pub,
		repoDoc: repoDoc,
		running: make(map[uint]bool),
	}
}

func (k *kbSpace) MsgType() mq.Message {
	return topic.MsgKBSpace{}
}

func (k *kbSpace) Topic() mq.Topic {
	return topic.TopicKBSpace
}

func (k *kbSpace) Group() string {
	return "koala_kb_space_folder"
}

func (k *kbSpace) AckWait() time.Duration {
	return time.Minute * 2
}

func (k *kbSpace) Concurrent() uint {
	return 4
}

func (k *kbSpace) getFolder(ctx context.Context, kbID uint, docID uint) (*model.KBDocument, error) {
	folderDoc, err := k.doc.GetByID(ctx, kbID, docID)
	if err != nil {
		return nil, err
	}

	if folderDoc.DocType != model.DocTypeSpace || folderDoc.FileType != model.FileTypeFolder || folderDoc.ParentID == 0 {
		return nil, err
	}

	spaceDoc, err := k.doc.GetByID(ctx, kbID, folderDoc.ParentID)
	if err != nil {
		return nil, err
	}

	if spaceDoc.ParentID != 0 {
		return nil, errors.New("invalid space")
	}

	folderDoc.PlatformOpt = spaceDoc.PlatformOpt

	return folderDoc, nil
}

func (k *kbSpace) Handle(ctx context.Context, msg mq.Message) error {
	docMsg := msg.(topic.MsgKBSpace)
	logger := k.logger.WithContext(ctx).With("msg", docMsg)

	switch docMsg.OP {
	case topic.OPInsert:
		return k.handleInsert(ctx, logger, docMsg)
	case topic.OPUpdate:
		return k.handleUpdate(ctx, logger, docMsg)
	case topic.OPDelete:
		return k.handleDelete(ctx, logger, docMsg)
	}

	logger.Warn("invalid msg op")

	return nil
}

func (k *kbSpace) handleInsert(ctx context.Context, logger *glog.Logger, msg topic.MsgKBSpace) error {
	if !k.run(msg.FolderID) {
		logger.Info("task running, skip")
		return nil
	}
	defer k.done(msg.FolderID)

	folder, err := k.getFolder(ctx, msg.KBID, msg.FolderID)
	if err != nil {
		logger.WithErr(err).Warn("get folder failed")
		return nil
	}

	list, err := k.anydoc.List(ctx, folder.Platform,
		anydoc.ListWithSpaceID(folder.DocID),
		anydoc.ListWithPlatformOpt(folder.PlatformOpt.Inner()),
	)
	if err != nil {
		logger.WithErr(err).Warn("list doc failed")
		return nil
	}

	if len(list.Docs) == 0 {
		logger.Info("empty doc, skip space export")
		return nil
	}

	pendingDoc := make([]model.KBDocument, len(list.Docs))

	for i, doc := range list.Docs {
		pendingDoc[i] = model.KBDocument{
			KBID:     msg.KBID,
			Platform: folder.Platform,
			DocType:  folder.DocType,
			DocID:    doc.ID,
			Title:    doc.Title,
			Desc:     doc.Summary,
			Status:   model.DocStatusPendingExport,
			ParentID: msg.FolderID,
		}
	}

	err = k.repoDoc.BatchCreate(ctx, &pendingDoc)
	if err != nil {
		logger.WithErr(err).Warn("batch create space folder doc failed")
		return nil
	}

	for i, doc := range list.Docs {
		_, err = k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
			BaseExportReq: svc.BaseExportReq{
				DBDoc: svc.BaseDBDoc{
					ID:       pendingDoc[i].ID,
					Type:     folder.DocType,
					ParentID: msg.FolderID,
				},
				KBID:  msg.KBID,
				UUID:  list.UUID,
				DocID: doc.ID,
				Title: doc.Title,
				Desc:  doc.Summary,
			},
			SpaceID:  folder.DocID,
			FileType: doc.FileType,
		})
		if err != nil {
			logger.WithErr(err).With("export_doc_id", doc.ID).Warn("export space doc failed")
			err = k.repoDoc.Update(ctx, map[string]any{
				"status":     model.DocStatusExportFailed,
				"message":    err.Error(),
				"updated_at": time.Now(),
			}, repo.QueryWithEqual("id", pendingDoc[i].ID))
			if err != nil {
				logger.WithErr(err).With("id", pendingDoc[i].ID).Error("update doc status failed")
			}
		}
	}

	return nil
}

type docInfo struct {
	id        uint
	updatedAt int64
}

func (k *kbSpace) handleUpdate(ctx context.Context, logger *glog.Logger, msg topic.MsgKBSpace) error {
	if msg.DocID == 0 {
		if !k.run(msg.FolderID) {
			logger.Info("task running, skip")
			return nil
		}
		defer k.done(msg.FolderID)
	}

	folder, err := k.getFolder(ctx, msg.KBID, msg.FolderID)
	if err != nil {
		logger.WithErr(err).Warn("get folder failed")
		return nil
	}

	exist := make(map[string]docInfo)

	if msg.DocID == 0 {
		listFolderRes, err := k.doc.ListSpaceFolderDoc(ctx, msg.KBID, msg.FolderID, svc.ListSpaceFolderDocReq{})
		if err != nil {
			logger.WithErr(err).Warn("list folder doc failed")
			return err
		}

		for _, item := range listFolderRes.Items {
			exist[item.DocID] = docInfo{
				id:        item.ID,
				updatedAt: int64(item.UpdatedAt),
			}
		}
	} else {
		doc, err := k.doc.GetByID(ctx, msg.KBID, msg.DocID)
		if err != nil {
			if errors.Is(err, database.ErrRecordNotFound) {
				logger.Info("doc not found, skip update")
				return nil
			}

			logger.WithErr(err).Warn("get doc failed")
			return err
		}

		if doc.ParentID != msg.FolderID {
			logger.Info("doc parent is not this folder, skip update")
			return nil
		}

		exist[doc.DocID] = docInfo{
			id:        doc.ID,
			updatedAt: int64(doc.UpdatedAt),
		}
	}

	list, err := k.anydoc.List(ctx, folder.Platform,
		anydoc.ListWithSpaceID(folder.DocID),
		anydoc.ListWithPlatformOpt(folder.PlatformOpt.Inner()),
	)
	if err != nil {
		logger.WithErr(err).Warn("list doc failed")
		return nil
	}

	for _, doc := range list.Docs {
		dbDoc, ok := exist[doc.ID]
		// 当 doc_id 大于 0 的时候，只更新该文档
		if msg.DocID > 0 && !ok {
			continue
		}

		delete(exist, doc.ID)

		if msg.DocID == 0 && msg.IncrUpdate && doc.UpdatedAt > 0 && doc.UpdatedAt < dbDoc.updatedAt {
			logger.With("doc_id", doc.ID).With("anydoc_updated", doc.UpdatedAt).With("dbdoc_updated", dbDoc.updatedAt).Info("incr update ignore doc")
			continue
		}

		if dbDoc.id > 0 {
			err = k.repoDoc.Update(ctx, map[string]any{
				"status":     model.DocStatusPendingExport,
				"message":    "",
				"updated_at": time.Now(),
			}, repo.QueryWithEqual("id", dbDoc.id))
			if err != nil {
				logger.WithErr(err).With("db_doc_id", dbDoc.id).Warn("update doc status failed, skip")
				return err
			}
		} else {
			newDoc := model.KBDocument{
				KBID:     msg.KBID,
				Platform: folder.Platform,
				DocType:  folder.DocType,
				DocID:    doc.ID,
				Title:    doc.Title,
				Desc:     doc.Summary,
				Status:   model.DocStatusPendingExport,
				ParentID: msg.FolderID,
			}
			err = k.repoDoc.Create(ctx, &newDoc)
			if err != nil {
				logger.WithErr(err).With("anydoc_doc_id", doc.ID).Warn("create doc failed")
				return err
			}

			dbDoc.id = newDoc.ID
		}

		_, err = k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
			BaseExportReq: svc.BaseExportReq{
				DBDoc: svc.BaseDBDoc{
					ID:       dbDoc.id,
					Type:     folder.DocType,
					ParentID: msg.FolderID,
				},
				KBID:  msg.KBID,
				UUID:  list.UUID,
				DocID: doc.ID,
				Title: doc.Title,
				Desc:  doc.Summary,
			},
			SpaceID:  folder.DocID,
			FileType: doc.FileType,
		})
		if err != nil {
			logger.WithErr(err).With("export_doc_id", doc.ID).Warn("export space doc failed")

			err = k.repoDoc.CreateOnIDConflict(ctx, &model.KBDocument{
				Base: model.Base{
					ID: dbDoc.id,
				},
				KBID:     msg.KBID,
				Platform: folder.Platform,
				DocType:  folder.DocType,
				DocID:    doc.ID,
				Title:    doc.Title,
				Desc:     doc.Summary,
				Status:   model.DocStatusExportFailed,
				ParentID: msg.FolderID,
			}, false)
			if err != nil {
				logger.WithErr(err).With("export_doc_id", doc.ID).Warn("update doc staus failed")
			}
		}
	}

	for _, doc := range exist {
		err = k.doc.Delete(ctx, msg.KBID, doc.id)
		if err != nil {
			logger.WithErr(err).Warn("delete space doc failed")
		}
	}

	return nil
}

func (k *kbSpace) handleDelete(ctx context.Context, logger *glog.Logger, msg topic.MsgKBSpace) error {
	folder, err := k.doc.ListSpaceFolderDoc(ctx, msg.KBID, msg.FolderID, svc.ListSpaceFolderDocReq{})
	if err != nil {
		logger.WithErr(err).Warn("list space folder failed")
		return nil
	}

	for _, item := range folder.Items {
		err = k.doc.Delete(ctx, msg.KBID, item.ID)
		if err != nil {
			logger.WithErr(err).With("item_id", item.ID).Warn("publish rag delete failed")
		}
	}

	return nil
}
