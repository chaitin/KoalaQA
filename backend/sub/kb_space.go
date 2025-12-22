package sub

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
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

func newKBSpace(doc *svc.KBDocument, anydoc anydoc.Anydoc, pub mq.Publisher, repoDoc *repo.KBDocument) *kbSpace {
	return &kbSpace{
		logger:  glog.Module("sub", "kb_space"),
		doc:     doc,
		anydoc:  anydoc,
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

	logger.Info("begin insert kb_space")

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

	for _, doc := range list.Docs {
		taskID, err := k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
			BaseExportReq: svc.BaseExportReq{
				DBDoc: svc.BaseDBDoc{
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
			logger.WithErr(err).With("export_task_id", taskID).With("export_doc_id", doc.ID).Warn("export space doc failed")
		}
	}

	return nil
}

type docInfo struct {
	id        uint
	status    model.DocStatus
	updatedAt int64
}

func (k *kbSpace) handleUpdate(ctx context.Context, logger *glog.Logger, msg topic.MsgKBSpace) error {
	if !k.run(msg.FolderID) {
		logger.Info("task running, skip")
		return nil
	}
	defer k.done(msg.FolderID)

	logger.Info("begin update kb_space")

	folder, err := k.getFolder(ctx, msg.KBID, msg.FolderID)
	if err != nil {
		logger.WithErr(err).Warn("get folder failed")
		return nil
	}

	exist := make(map[string]docInfo)

	req := svc.ListSpaceFolderDocReq{}

	if msg.UpdateType == topic.KBSpaceUpdateTypeFailed {
		req.Status = []model.DocStatus{model.DocStatusApplyFailed, model.DocStatusExportFailed}
	}

	listFolderRes, err := k.doc.ListSpaceFolderDoc(ctx, msg.KBID, msg.FolderID, req)
	if err != nil {
		logger.WithErr(err).Warn("list folder doc failed")
		return err
	}

	for _, item := range listFolderRes.Items {
		exist[item.DocID] = docInfo{
			id:        item.ID,
			status:    item.Status,
			updatedAt: int64(item.UpdatedAt),
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
		if ok {
			delete(exist, doc.ID)

			if msg.UpdateType == topic.KBSpaceUpdateTypeIncr && doc.UpdatedAt > 0 && doc.UpdatedAt < dbDoc.updatedAt &&
				!slices.Contains([]model.DocStatus{model.DocStatusExportFailed, model.DocStatusApplyFailed}, dbDoc.status) {
				logger.With("doc_id", doc.ID).With("anydoc_updated", doc.UpdatedAt).With("dbdoc_updated", dbDoc.updatedAt).Info("incr update ignore doc")
				continue
			}
		} else if msg.UpdateType == topic.KBSpaceUpdateTypeFailed {
			continue
		}

		taskID, err := k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
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
			logger.WithErr(err).With("export_task_id", taskID).With("export_doc_id", doc.ID).Warn("export space doc failed")
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
