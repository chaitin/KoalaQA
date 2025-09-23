package sub

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/svc"
)

type kbSpace struct {
	logger *glog.Logger
	doc    *svc.KBDocument
	anydoc anydoc.Anydoc
	cache  cache.Cache[topic.TaskMeta]
	pub    mq.Publisher

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

func newKBSpace(doc *svc.KBDocument, anydoc anydoc.Anydoc, cache cache.Cache[topic.TaskMeta], pub mq.Publisher) *kbSpace {
	return &kbSpace{
		logger:  glog.Module("sub", "kb_space"),
		doc:     doc,
		anydoc:  anydoc,
		cache:   cache,
		pub:     pub,
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
		return k.handleInsert(ctx, logger, docMsg.KBID, docMsg.FolderID)
	case topic.OPUpdate:
		return k.handleUpdate(ctx, logger, docMsg.KBID, docMsg.FolderID)
	case topic.OPDelete:
		return k.handleDelete(ctx, logger, docMsg.KBID, docMsg.FolderID)
	}

	logger.Warn("invalid msg op")

	return nil
}

func (k *kbSpace) handleInsert(ctx context.Context, logger *glog.Logger, kbID uint, folderID uint) error {
	if !k.run(folderID) {
		logger.Info("task running, skip")
		return nil
	}
	defer k.done(folderID)

	folder, err := k.getFolder(ctx, kbID, folderID)
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

	for _, doc := range list.Docs {
		switch folder.Platform {
		case platform.PlatformPandawiki:
			_, err = k.doc.PandawikiExport(ctx, svc.PandawikiExportReq{
				BaseExportReq: svc.BaseExportReq{
					DBDoc: svc.BaseDBDoc{
						Type:     folder.DocType,
						ParentID: folderID,
					},
					KBID:  kbID,
					UUID:  list.UUID,
					DocID: doc.ID,
					Title: doc.Title,
					Desc:  doc.Summary,
				},
				SpaceID: folder.DocID,
			})
			if err != nil {
				logger.WithErr(err).With("export_doc_id", doc.ID).Warn("export pandawiki doc failed")
			}
		}
	}

	return nil
}

func (k *kbSpace) handleUpdate(ctx context.Context, logger *glog.Logger, kbID uint, folderID uint) error {
	if !k.run(folderID) {
		logger.Info("task running, skip")
		return nil
	}
	defer k.done(folderID)

	folder, err := k.getFolder(ctx, kbID, folderID)
	if err != nil {
		logger.WithErr(err).Warn("get folder failed")
		return nil
	}

	listFolderRes, err := k.doc.ListSpaceFolderDoc(ctx, kbID, folderID)
	if err != nil {
		logger.WithErr(err).Warn("list folder doc failed")
		return nil
	}

	exist := make(map[string]uint)

	for _, item := range listFolderRes.Items {
		exist[item.DocID] = item.ID
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
		switch folder.Platform {
		case platform.PlatformPandawiki:
			_, err = k.doc.PandawikiExport(ctx, svc.PandawikiExportReq{
				BaseExportReq: svc.BaseExportReq{
					DBDoc: svc.BaseDBDoc{
						ID:       exist[doc.ID],
						Type:     folder.DocType,
						ParentID: folderID,
					},
					KBID:  kbID,
					UUID:  list.UUID,
					DocID: doc.ID,
					Title: doc.Title,
					Desc:  doc.Summary,
				},
				SpaceID: folder.DocID,
			})
			if err != nil {
				logger.WithErr(err).With("export_doc_id", doc.ID).Warn("export pandawiki doc failed")
			}
		}

		delete(exist, doc.ID)
	}

	for _, id := range exist {
		err = k.doc.Delete(ctx, kbID, id)
		if err != nil {
			logger.WithErr(err).Warn("delete space doc failed")
		}
	}

	return nil
}

func (k *kbSpace) handleDelete(ctx context.Context, logger *glog.Logger, kbID uint, folderID uint) error {
	folder, err := k.doc.ListSpaceFolderDoc(ctx, kbID, folderID)
	if err != nil {
		logger.WithErr(err).Warn("list space folder failed")
		return nil
	}

	for _, item := range folder.Items {
		err = k.doc.Delete(ctx, kbID, item.ID)
		if err != nil {
			logger.WithErr(err).With("item_id", item.ID).Warn("publish rag delete failed")
		}
	}

	return nil
}
