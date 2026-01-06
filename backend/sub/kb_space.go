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

	exportFolders := folder.ExportOpt.Inner().Folders

	if len(exportFolders) == 0 {
		exportFolders = append(exportFolders, model.ExportFolder{})
	}

	for _, exportFolder := range exportFolders {
		parentIDM := make(map[string]uint)
		if exportFolder.FolderID != "" && exportFolder.FolderID != folder.DocID {
			dbExportFolder, err := k.repoDoc.GetSpaceDoc(ctx, folder.KBID, folder.ID, exportFolder.FolderID)
			if err != nil {
				logger.WithErr(err).With("folder_id", exportFolder.FolderID).Warn("get space doc failed")
				return err
			}

			parentIDM[dbExportFolder.DocID] = dbExportFolder.ID
		}

		needExportDocIDs := make(map[string]bool)
		for _, docID := range exportFolder.DocIDs {
			needExportDocIDs[docID] = true
		}

		listOpts := []anydoc.ListOptFunc{
			anydoc.ListWithSpaceID(folder.DocID),
			anydoc.ListWithPlatformOpt(folder.PlatformOpt.Inner()),
			anydoc.ListWithShallow(len(exportFolder.DocIDs) > 0),
		}

		if folder.DocID != exportFolder.FolderID {
			listOpts = append(listOpts, anydoc.ListWithFolderID(exportFolder.FolderID))
		}

		list, err := k.anydoc.List(ctx, folder.Platform, listOpts...)
		if err != nil {
			logger.WithErr(err).With("folder_doc_id", exportFolder.FolderID).Warn("list doc failed")
			return nil
		}

		err = list.Docs.Range(anydoc.ListDoc{}, func(parent, doc anydoc.ListDoc) error {
			if doc.ID == "" || exportFolder.FolderID == doc.ID || len(needExportDocIDs) > 0 && !needExportDocIDs[doc.ID] {
				return nil
			}

			parentID, ok := parentIDM[parent.ID]
			if !ok {
				parentID = folder.ID
			}

			if !doc.File {
				newFolder := model.KBDocument{
					DocID:        doc.ID,
					KBID:         folder.KBID,
					Title:        doc.Title,
					Desc:         doc.Summary,
					Platform:     folder.Platform,
					FileType:     model.FileTypeFolder,
					DocType:      model.DocTypeSpace,
					Status:       model.DocStatusApplySuccess,
					ParentID:     parentID,
					RootParentID: folder.ID,
				}
				err = k.repoDoc.Create(ctx, &newFolder)
				if err != nil {
					logger.WithErr(err).With("doc_id", doc.ID).Warn("create folder failed")
					return err
				}

				parentIDM[newFolder.DocID] = newFolder.ID
				return nil
			}

			taskID, err := k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
				BaseExportReq: svc.BaseExportReq{
					DBDoc: svc.BaseDBDoc{
						Type:         folder.DocType,
						ParentID:     parentID,
						RootParentID: folder.ID,
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

			return nil
		})
		if err != nil {
			return err
		}

	}

	return nil
}

type docInfo struct {
	id        uint
	status    model.DocStatus
	title     string
	parentID  uint
	updatedAt int64
}

type docKey struct {
	docID string
	file  bool
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

	exportFolders := folder.ExportOpt.Inner().Folders
	if len(exportFolders) == 0 {
		exportFolders = append(exportFolders, model.ExportFolder{})
	}

	var statusFilter []model.DocStatus
	if msg.UpdateType == topic.KBSpaceUpdateTypeFailed {
		statusFilter = []model.DocStatus{model.DocStatusApplyFailed, model.DocStatusExportFailed}
	}

	needExportFolder := make(map[string]bool)
	for _, exportFolder := range exportFolders {
		needExportFolder[exportFolder.FolderID] = true
	}

	for _, exportFolder := range exportFolders {
		parentIDM := make(map[string]uint)
		exportFolderID := msg.FolderID
		if exportFolder.FolderID != "" && exportFolder.FolderID != folder.DocID {
			dbExportFolder, err := k.repoDoc.GetSpaceDoc(ctx, folder.KBID, folder.ID, exportFolder.FolderID)
			if err != nil {
				logger.WithErr(err).With("folder_id", exportFolder.FolderID).Warn("get space doc failed")
				return err
			}

			exportFolderID = dbExportFolder.ID
			parentIDM[dbExportFolder.DocID] = dbExportFolder.ID
		}

		listFolderRes, err := k.repoDoc.ListSpaceFolderAll(ctx, folder.ID, exportFolderID, statusFilter, len(exportFolder.DocIDs) > 0)
		if err != nil {
			logger.WithErr(err).Warn("list folder doc failed")
			return err
		}

		exist := make(map[docKey]docInfo)

		for _, item := range listFolderRes {
			exist[docKey{
				docID: item.DocID,
				file:  item.FileType != model.FileTypeFolder,
			}] = docInfo{
				id:        item.ID,
				status:    item.Status,
				title:     item.Title,
				parentID:  item.ParentID,
				updatedAt: int64(item.UpdatedAt),
			}
		}

		needExportDocIDs := make(map[string]bool)
		for _, docID := range exportFolder.DocIDs {
			needExportDocIDs[docID] = true
		}

		listOpts := []anydoc.ListOptFunc{
			anydoc.ListWithSpaceID(folder.DocID),
			anydoc.ListWithPlatformOpt(folder.PlatformOpt.Inner()),
			anydoc.ListWithShallow(len(exportFolder.DocIDs) > 0),
		}

		if folder.DocID != exportFolder.FolderID {
			listOpts = append(listOpts, anydoc.ListWithFolderID(exportFolder.FolderID))
		}

		list, err := k.anydoc.List(ctx, folder.Platform, listOpts...)
		if err != nil {
			logger.WithErr(err).Warn("list doc failed")

			e := k.repoDoc.UpdateSpaceFolderAll(ctx, exportFolderID, statusFilter, model.DocStatusExportFailed, err.Error())
			if e != nil {
				logger.WithErr(e).Warn("set doc export failed error")
			}
			return nil
		}

		err = list.Docs.Range(anydoc.ListDoc{}, func(parent, doc anydoc.ListDoc) error {
			if doc.ID == "" || (exportFolder.FolderID == doc.ID && !doc.File) || (len(needExportDocIDs) > 0 && !needExportDocIDs[doc.ID]) {
				return nil
			}

			parentID, ok := parentIDM[parent.ID]
			if !ok {
				parentID = exportFolderID
			}

			key := docKey{
				docID: doc.ID,
				file:  doc.File,
			}
			dbDoc, ok := exist[key]
			if ok {
				delete(exist, key)

				if !doc.File {
					parentIDM[doc.ID] = dbDoc.id
					if dbDoc.title != doc.Title || parentID != dbDoc.parentID {
						err = k.repoDoc.Update(ctx, map[string]any{
							"title":     doc.Title,
							"parent_id": parentID,
						}, repo.QueryWithEqual("id", dbDoc.id))
						if err != nil {
							logger.WithErr(err).With("doc_id", dbDoc.id).Warn("update title failed")
							return err
						}
					}
					return nil
				}

				if msg.UpdateType == topic.KBSpaceUpdateTypeIncr && doc.UpdatedAt > 0 && doc.UpdatedAt < dbDoc.updatedAt &&
					!slices.Contains([]model.DocStatus{model.DocStatusExportFailed, model.DocStatusApplyFailed}, dbDoc.status) {
					if dbDoc.parentID != parentID {
						err = k.repoDoc.Update(ctx, map[string]any{"parent_id": parentID}, repo.QueryWithEqual("id", dbDoc.id))
						if err != nil {
							logger.WithErr(err).With("doc_id", dbDoc.id).With("parent_id", parentID).Warn("update parent_id failed")
							return err
						}
					}
					logger.With("doc_id", doc.ID).With("anydoc_updated", doc.UpdatedAt).With("dbdoc_updated", dbDoc.updatedAt).Info("incr update ignore doc")
					return nil
				}
			} else if msg.UpdateType == topic.KBSpaceUpdateTypeFailed {
				return nil
			} else if !doc.File {
				newFolder := model.KBDocument{
					DocID:        doc.ID,
					KBID:         folder.KBID,
					Title:        doc.Title,
					Desc:         doc.Summary,
					Platform:     folder.Platform,
					DocType:      model.DocTypeSpace,
					FileType:     model.FileTypeFolder,
					Status:       model.DocStatusApplySuccess,
					ParentID:     parentID,
					RootParentID: folder.ID,
				}
				err = k.repoDoc.Create(ctx, &newFolder)
				if err != nil {
					logger.WithErr(err).With("doc_id", doc.ID).Warn("create folder failed")
					return err
				}

				parentIDM[newFolder.DocID] = newFolder.ID
				return nil
			}

			taskID, err := k.doc.SpaceExport(ctx, folder.Platform, svc.SpaceExportReq{
				BaseExportReq: svc.BaseExportReq{
					DBDoc: svc.BaseDBDoc{
						ID:           dbDoc.id,
						Type:         folder.DocType,
						ParentID:     parentID,
						RootParentID: folder.ID,
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

			return nil
		})
		if err != nil {
			return err
		}

		for key, doc := range exist {
			if !key.file && needExportFolder[key.docID] {
				continue
			}

			err = k.doc.Delete(ctx, msg.KBID, doc.id)
			if err != nil {
				logger.WithErr(err).Warn("delete space doc failed")
			}
		}
	}

	return nil
}

func (k *kbSpace) handleDelete(ctx context.Context, logger *glog.Logger, msg topic.MsgKBSpace) error {
	if msg.SubFolderID == 0 {
		msg.SubFolderID = msg.FolderID
	}
	docs, err := k.repoDoc.ListSpaceFolderAll(ctx, msg.FolderID, msg.SubFolderID, nil, false)
	if err != nil {
		logger.WithErr(err).Warn("list space folder failed")
		return nil
	}

	for _, item := range docs {
		err = k.doc.Delete(ctx, msg.KBID, item.ID)
		if err != nil {
			logger.WithErr(err).With("item_id", item.ID).Warn("publish rag delete failed")
		}
	}

	return nil
}
