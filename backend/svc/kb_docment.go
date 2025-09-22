package svc

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"slices"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type BaseDBDoc struct {
	ID       uint
	Type     model.DocType
	ParentID uint
}

type BaseExportReq struct {
	DBDoc BaseDBDoc `json:"-"`

	KBID  uint   `json:"kb_id" binding:"required"`
	UUID  string `json:"uuid" binding:"required"`
	DocID string `json:"doc_id" binding:"required"`
	Title string `json:"title" binding:"required"`
	Desc  string `json:"desc"`
}

type KBDocument struct {
	repoDoc       *repo.KBDocument
	cache         cache.Cache[topic.TaskMeta]
	svcPublicAddr *PublicAddress
	anydoc        anydoc.Anydoc
	pub           mq.Publisher
	oc            oss.Client
	logger        *glog.Logger
}

type FeishuListReq struct {
	UUID        string `json:"uuid"`
	AppID       string `json:"app_id"`
	AppSecret   string `json:"app_secret"`
	AccessToken string `json:"access_token"`
	SpaceID     string `json:"space_id"`
}

func (d *KBDocument) FeishuList(ctx context.Context, req FeishuListReq) (*anydoc.ListRes, error) {
	return d.anydoc.List(ctx, platform.PlatformFeishu,
		anydoc.ListWithUUID(req.UUID),
		anydoc.ListWithAppInfo(req.AppID, req.AppSecret, req.AccessToken),
		anydoc.ListWithSpaceID(req.SpaceID),
	)
}

type FeishuExportReq struct {
	BaseExportReq
	FileType string `json:"file_type" binding:"required"`
	SpaceID  string `json:"space_id" binding:"required"`
}

func (d *KBDocument) FeishuExport(ctx context.Context, req FeishuExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformFeishu, req.BaseExportReq, anydoc.ExportWithFeishu(req.SpaceID, req.FileType))
}

type PandawikiExportReq struct {
	BaseExportReq
	SpaceID string `json:"space_id" binding:"required"`
}

func (d *KBDocument) PandawikiExport(ctx context.Context, req PandawikiExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformPandawiki, req.BaseExportReq, anydoc.ExportWithSpaceID(req.SpaceID))
}

type YueQueListReq struct {
	UUID string                `form:"uuid"`
	File *multipart.FileHeader `form:"file"`
}

func (d *KBDocument) YuQueList(ctx context.Context, req YueQueListReq) (*anydoc.ListRes, error) {
	return d.anydoc.List(ctx, platform.PlatformYuQue,
		anydoc.ListWithUUID(req.UUID),
		anydoc.ListWithReader(req.File),
	)
}

type YuQueExportReq struct {
	BaseExportReq
}

func (d *KBDocument) YuQueExport(ctx context.Context, req YuQueExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformYuQue, req.BaseExportReq)
}

type FileListReq struct {
	File *multipart.FileHeader `form:"file" swaggerignore:"true"`
}

func (d *KBDocument) FileList(ctx context.Context, req FileListReq) (*anydoc.ListRes, error) {
	return d.anydoc.List(ctx, platform.PlatformFile,
		anydoc.ListWithReader(req.File),
	)
}

type FileExportReq struct {
	BaseExportReq
}

func (d *KBDocument) FileExport(ctx context.Context, req FileExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformFile, req.BaseExportReq)
}

type URLListReq struct {
	URL string `json:"url" binding:"required"`
}

func (d *KBDocument) URLList(ctx context.Context, req URLListReq) (*anydoc.ListRes, error) {
	return d.anydoc.List(ctx, platform.PlatformURL,
		anydoc.ListWithURL(req.URL),
	)
}

type URLExportReq struct {
	BaseExportReq
}

func (d *KBDocument) URLExport(ctx context.Context, req URLExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformURL, req.BaseExportReq)
}

type SitemapListReq struct {
	URL string `json:"url" binding:"required"`
}

func (d *KBDocument) SitemapList(ctx context.Context, req SitemapListReq) (*anydoc.ListRes, error) {
	return d.anydoc.List(ctx, platform.PlatformSitemap,
		anydoc.ListWithURL(req.URL),
	)
}

type SitemapExportReq struct {
	BaseExportReq
}

func (d *KBDocument) SitemapExport(ctx context.Context, req SitemapExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformSitemap, req.BaseExportReq)
}

type TaskReq struct {
	IDs []string `json:"ids" binding:"required"`
}

func (d *KBDocument) Task(ctx context.Context, req TaskReq) ([]topic.TaskMeta, error) {
	res := make([]topic.TaskMeta, len(req.IDs))
	for i, id := range req.IDs {
		meta, ok := d.cache.Get(id)
		if !ok {
			res[i] = topic.TaskMeta{
				TaskHead: topic.TaskHead{
					TaskID: id,
					Status: topic.TaskStatusTimeout,
					Err:    "task not found",
				},
			}
		}

		res[i] = meta
	}

	return res, nil
}

func (d *KBDocument) exportWithCache(ctx context.Context, platform platform.PlatformType, baseInfo BaseExportReq, optFuncs ...anydoc.ExportFunc) (string, error) {
	o := anydoc.GetExportOpt(optFuncs...)
	taskID, err := d.anydoc.Export(ctx, platform, baseInfo.UUID, baseInfo.DocID, anydoc.ExportWithOpt(o))
	if err != nil {
		return "", err
	}

	d.cache.Set(taskID, topic.TaskMeta{
		DBDocID:   baseInfo.DBDoc.ID,
		KBID:      baseInfo.KBID,
		Title:     baseInfo.Title,
		Platform:  platform,
		Desc:      baseInfo.Desc,
		ParentID:  baseInfo.DBDoc.ParentID,
		DocType:   baseInfo.DBDoc.Type,
		ExportOpt: o,
		TaskHead: topic.TaskHead{
			TaskID: taskID,
			DocID:  baseInfo.DocID,
			Status: topic.TaskStatusInProgress,
		},
	})

	return taskID, nil
}

type DocListReq struct {
	model.Pagination

	Title    *string         `form:"title"`
	FileType *model.FileType `form:"file_type"`
}

type DocListItem struct {
	model.Base

	Platform platform.PlatformType `json:"platform"`
	Title    string                `json:"title"`
	Desc     string                `json:"desc"`
	FileType model.FileType        `json:"file_type"`
	Status   model.DocStatus       `json:"status"`
}

func (d *KBDocument) List(ctx context.Context, kbID uint, docType model.DocType, req DocListReq) (*model.ListRes[DocListItem], error) {
	var res model.ListRes[DocListItem]

	err := d.repoDoc.List(ctx, &res.Items,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithILike("title", req.Title),
		repo.QueryWithEqual("file_type", req.FileType),
		repo.QueryWithEqual("doc_type", docType),
		repo.QueryWithPagination(&req.Pagination),
		repo.QueryWithOrderBy("id DESC"),
	)
	if err != nil {
		return nil, err
	}

	err = d.repoDoc.Count(ctx, &res.Total,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithILike("title", req.Title),
		repo.QueryWithEqual("file_type", req.FileType),
		repo.QueryWithEqual("doc_type", docType),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type DocCreateQAReq struct {
	Title    string `json:"title" binding:"required"`
	Desc     string `json:"desc"`
	Markdown string `json:"markdown" binding:"required"`
}

func (d *KBDocument) CreateQA(ctx context.Context, kbID uint, req DocCreateQAReq) (uint, error) {
	doc := model.KBDocument{
		KBID:     kbID,
		DocType:  model.DocTypeQuestion,
		Title:    req.Title,
		Desc:     req.Desc,
		Markdown: []byte(req.Markdown),
		Status:   model.DocStatusAppling,
	}
	err := d.repoDoc.Create(ctx, &doc)
	if err != nil {
		return 0, err
	}
	if err := d.pub.Publish(ctx, topic.TopicKBDocumentRag, topic.MsgKBDocument{
		OP:    topic.OPInsert,
		KBID:  kbID,
		DocID: doc.ID,
	}); err != nil {
		return 0, err
	}
	return doc.ID, nil
}

type DocUpdateReq struct {
	Title    string `json:"title" binding:"required"`
	Desc     string `json:"desc"`
	Markdown string `json:"markdown"`
}

func (d *KBDocument) Update(ctx context.Context, kbID uint, docID uint, req DocUpdateReq) error {
	err := d.repoDoc.Update(ctx, map[string]any{
		"title":    req.Title,
		"desc":     req.Desc,
		"markdown": []byte(req.Markdown),
	}, repo.QueryWithEqual("id", docID), repo.QueryWithEqual("kb_id", kbID))
	if err != nil {
		return err
	}
	if err := d.pub.Publish(ctx, topic.TopicKBDocumentRag, topic.MsgKBDocument{
		OP:    topic.OPUpdate,
		KBID:  kbID,
		DocID: docID,
	}); err != nil {
		return err
	}
	return nil
}

func (d *KBDocument) UpdateByPlatform(ctx context.Context, kbID uint, docID uint) (string, error) {
	var doc model.KBDocument
	err := d.repoDoc.GetByID(ctx, &doc, kbID, docID, repo.QueryWithSelectColumn(
		"id", "platform", "platform_opt", "doc_id", "export_opt", "title", "desc",
	))
	if err != nil {
		return "", err
	}

	if !slices.Contains([]platform.PlatformType{
		platform.PlatformURL, platform.PlatformSitemap,
	}, doc.Platform) {
		return "", errors.New("platform not support")
	}

	listRes, err := d.anydoc.List(ctx, doc.Platform, anydoc.ListWithPlatformOpt(doc.PlatformOpt.Inner()))
	if err != nil {
		return "", err
	}

	for _, listDoc := range listRes.Docs {
		if listDoc.ID != doc.DocID {
			continue
		}

		doc.Title = listDoc.Title
		doc.Desc = listDoc.FileType
	}

	return d.exportWithCache(ctx, doc.Platform, BaseExportReq{
		DBDoc: BaseDBDoc{
			ID:       doc.ID,
			ParentID: doc.ParentID,
			Type:     doc.DocType,
		},
		KBID:  kbID,
		UUID:  listRes.UUID,
		DocID: doc.DocID,
		Title: doc.Title,
		Desc:  doc.Desc,
	}, anydoc.ExportWithOpt(doc.ExportOpt.Inner()))
}

func (d *KBDocument) ossDir(kbID uint) string {
	return fmt.Sprintf("assets/kb/%d/question", kbID)
}

func (d *KBDocument) Delete(ctx context.Context, kbID uint, docID uint) error {
	var doc model.KBDocument
	err := d.repoDoc.GetByID(ctx, &doc, kbID, docID)
	if err != nil {
		return err
	}
	err = d.repoDoc.Delete(ctx,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithEqual("id", docID),
	)
	if err != nil {
		return err
	}
	if err := d.pub.Publish(ctx, topic.TopicKBDocumentRag, topic.MsgKBDocument{
		OP:    topic.OPDelete,
		KBID:  kbID,
		DocID: docID,
		RagID: doc.RagID,
	}); err != nil {
		return err
	}
	return nil
}

func (d *KBDocument) Detail(ctx context.Context, kbID uint, docID uint) (*model.KBDocumentDetail, error) {
	var doc model.KBDocumentDetail
	err := d.repoDoc.GetByID(ctx, &doc, kbID, docID)
	if err != nil {
		return nil, err
	}

	// 文档的 markdown 是 oss path，需要签名才能访问
	if doc.DocType == model.DocTypeDocument {
		publicAddress, err := d.svcPublicAddr.Get(ctx)
		if err != nil {
			return nil, err
		}

		markdownPath, err := d.oc.Sign(ctx, doc.Markdown, oss.WithBucket("anydoc"), oss.WithSignURL(publicAddress.Address))
		if err != nil {
			return nil, err
		}

		doc.Markdown = markdownPath
		doc.JSON = ""
	}

	return &doc, nil
}

func (d *KBDocument) GetByID(ctx context.Context, kbID uint, docID uint) (*model.KBDocument, error) {
	var doc model.KBDocument
	err := d.repoDoc.GetByID(ctx, &doc, kbID, docID)
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (d *KBDocument) UpdateRagID(ctx context.Context, kbID uint, docID uint, ragID string) error {
	return d.repoDoc.Update(ctx, map[string]any{
		"rag_id": ragID,
	}, repo.QueryWithEqual("id", docID), repo.QueryWithEqual("kb_id", kbID))
}

type UploadFileReq struct {
	File *multipart.FileHeader `form:"file" binding:"required"`
}

func (d *KBDocument) UploadFile(ctx context.Context, kbID uint, req UploadFileReq) (string, error) {
	f, err := req.File.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	return d.oc.Upload(ctx, d.ossDir(kbID), f,
		oss.WithExt(filepath.Ext(req.File.Filename)),
		oss.WithFileSize(int(req.File.Size)),
		oss.WithLimitSize(),
		oss.WithPublic(),
	)
}

type ListSpaceItem struct {
	model.Base

	Platform platform.PlatformType `json:"platform"`
	Title    string                `json:"title"`
	Total    int64                 `json:"total"`
}

func (d *KBDocument) ListSpace(ctx context.Context, kbID uint) (*model.ListRes[ListSpaceItem], error) {
	var res model.ListRes[ListSpaceItem]
	err := d.repoDoc.ListSpace(ctx, &res.Items, kbID,
		repo.QueryWithEqual("parent_id", 0),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type ListSpaceFolderDocItem struct {
	model.Base

	DocID string `json:"doc_id"`
}

func (d *KBDocument) ListSpaceFolderDoc(ctx context.Context, kbID uint, folderID uint) (*model.ListRes[ListSpaceFolderDocItem], error) {
	var res model.ListRes[ListSpaceFolderDocItem]

	err := d.repoDoc.List(ctx, &res.Items,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithEqual("parent_id", folderID),
		repo.QueryWithEqual("doc_type", model.DocTypeSpace),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type GetSpaceRes struct {
	model.Base
	Platform    platform.PlatformType          `json:"platform"`
	PlatformOpt model.JSONB[model.PlatformOpt] `json:"platform_opt" swaggerignore:"true"`
	Title       string                         `json:"title"`
}

func (d *KBDocument) GetSpace(ctx context.Context, kbID uint, spaceID uint) (*GetSpaceRes, error) {
	var res GetSpaceRes
	err := d.repoDoc.GetByID(ctx, &res, kbID, spaceID,
		repo.QueryWithEqual("doc_type", model.DocTypeSpace),
		repo.QueryWithEqual("parent_id", 0),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type CreateSpaceReq struct {
	Platform platform.PlatformType `json:"platform"`
	Opt      model.PlatformOpt     `json:"opt"`
	Title    string                `json:"title" binding:"required"`
}

func (d *KBDocument) checkPlatformOpt(p platform.PlatformType, opt model.PlatformOpt) error {
	switch p {
	case platform.PlatformPandawiki:
		_, err := util.ParseHTTP(opt.URL)
		if err != nil {
			return err
		}

		if opt.AccessToken == "" {
			return errors.New("empty access token")
		}
	default:
		return errors.ErrUnsupported
	}

	return nil
}

func (d *KBDocument) CreateSpace(ctx context.Context, kbID uint, req CreateSpaceReq) (uint, error) {
	err := d.checkPlatformOpt(req.Platform, req.Opt)
	if err != nil {
		return 0, err
	}

	doc := model.KBDocument{
		KBID:        kbID,
		Platform:    req.Platform,
		PlatformOpt: model.NewJSONB(req.Opt),
		Title:       req.Title,
		FileType:    model.FileTypeFolder,
		DocType:     model.DocTypeSpace,
		Status:      model.DocStatusAppling,
		ParentID:    0,
	}
	err = d.repoDoc.Create(ctx, &doc)
	if err != nil {
		return 0, err
	}

	return doc.ID, nil
}

type UpdateSpaceReq struct {
	Opt   *model.PlatformOpt `json:"opt"`
	Title string             `json:"title"`
}

func (d *KBDocument) UpdateSpace(ctx context.Context, kbID uint, docID uint, req UpdateSpaceReq) error {
	doc, err := d.GetByID(ctx, kbID, docID)
	if err != nil {
		return err
	}

	updateM := map[string]any{
		"updated_at": time.Now(),
	}

	if req.Opt != nil {
		err = d.checkPlatformOpt(doc.Platform, *req.Opt)
		if err != nil {
			return err
		}

		updateM["platform_opt"] = model.NewJSONB(req.Opt)
	}

	if req.Title != "" {
		updateM["title"] = req.Title
	}

	if len(updateM) == 1 {
		return nil
	}

	err = d.repoDoc.Update(ctx, updateM,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithEqual("id", docID),
	)
	if err != nil {
		return err
	}

	return nil
}

func (d *KBDocument) DeleteSpace(ctx context.Context, kbID uint, docID uint) error {
	// TODO: delete sub doc
	err := d.repoDoc.Delete(ctx,
		repo.QueryWithEqual("kb_id", kbID),
		repo.QueryWithEqual("id", docID),
		repo.QueryWithEqual("doc_type", model.DocTypeSpace),
	)
	if err != nil {
		return err
	}

	return nil
}

type ListSpaceKBReq struct {
	SpaceID string `json:"space_id"`
}

type ListSpaceKBItem struct {
	DocID    string         `json:"doc_id"`
	Title    string         `json:"title"`
	FileType model.FileType `json:"file_type"`
	Desc     string         `json:"desc"`
}

func (d *KBDocument) ListSpaceKB(ctx context.Context, kbID uint, docID uint, req ListSpaceKBReq) (*model.ListRes[ListSpaceKBItem], error) {
	doc, err := d.GetByID(ctx, kbID, docID)
	if err != nil {
		return nil, err
	}

	listRes, err := d.anydoc.List(ctx, doc.Platform,
		anydoc.ListWithSpaceID(req.SpaceID),
		anydoc.ListWithPlatformOpt(doc.PlatformOpt.Inner()),
	)
	if err != nil {
		return nil, err
	}

	fileType := model.FileTypeFolder
	if req.SpaceID != "" {
		fileType = model.FileTypeFile
	}

	var res model.ListRes[ListSpaceKBItem]
	for _, listDoc := range listRes.Docs {
		res.Items = append(res.Items, ListSpaceKBItem{
			DocID:    listDoc.ID,
			Title:    listDoc.Title,
			Desc:     listDoc.Summary,
			FileType: fileType,
		})
	}

	return &res, nil
}

type CreateSpaceForlderItem struct {
	DocID string `json:"doc_id"`
	Title string `json:"title"`
}
type CreateSpaceFolderReq struct {
	Items []CreateSpaceForlderItem `json:"docs" binding:"required"`
}

func (d *KBDocument) CreateSpaceFolder(ctx context.Context, kbID uint, parentID uint, req CreateSpaceFolderReq) error {
	parentDoc, err := d.GetByID(ctx, kbID, parentID)
	if err != nil {
		return err
	}

	if parentDoc.DocType != model.DocTypeSpace {
		return errors.ErrUnsupported
	}

	docs := make([]model.KBDocument, 0)
	exist := make(map[string]bool)

	for _, item := range req.Items {
		if exist[item.DocID] {
			continue
		}

		docs = append(docs, model.KBDocument{
			DocID:    item.DocID,
			Title:    item.Title,
			Platform: parentDoc.Platform,
			FileType: model.FileTypeFolder,
			Status:   model.DocStatusAppling,
			ParentID: parentID,
		})

		exist[item.DocID] = true
	}

	if len(docs) == 0 {
		return errors.New("doc not found")
	}

	err = d.repoDoc.BatchCreate(ctx, docs)
	if err != nil {
		return err
	}

	for _, doc := range docs {
		err = d.pub.Publish(ctx, topic.TopicKBSpace, topic.MsgKBSpace{
			OP:       topic.OPInsert,
			KBID:     kbID,
			FolderID: doc.ID,
		})
		if err != nil {
			d.logger.WithContext(ctx).WithErr(err).With("kb_id", kbID).With("folder_id", doc.ID).Warn("pub insert msg failed")
		}
	}

	return nil
}

type CreateSpaceDocReq struct {
	DocID string
	Title string
	Desc  string
}

func (d *KBDocument) CreateSpaceDoc(ctx context.Context, kbID uint, parentID uint, req CreateSpaceDocReq) (uint, error) {
	parentDoc, err := d.GetByID(ctx, kbID, parentID)
	if err != nil {
		return 0, err
	}

	if parentDoc.DocType != model.DocTypeSpace {
		return 0, errors.ErrUnsupported
	}

	doc := model.KBDocument{
		KBID:     kbID,
		Platform: parentDoc.Platform,
		DocID:    req.DocID,
		Title:    req.Title,
		Desc:     req.Desc,
		FileType: model.FileTypeFile,
		DocType:  model.DocTypeSpace,
		Status:   model.DocStatusAppling,
		ParentID: parentID,
	}
	err = d.repoDoc.Create(ctx, &doc)
	if err != nil {
		return 0, err
	}

	return doc.ID, nil
}

type ListSpaceFolderItem struct {
	model.Base

	RagID  string          `json:"rag_id"`
	DocID  string          `json:"doc_id"`
	Title  string          `json:"title"`
	Status model.DocStatus `json:"status"`
	Total  int64           `json:"total"`
}

func (d *KBDocument) ListSpaceFolder(ctx context.Context, kbID uint, parentID uint) (*model.ListRes[ListSpaceFolderItem], error) {
	var res model.ListRes[ListSpaceFolderItem]
	err := d.repoDoc.ListSpace(ctx, &res, kbID,
		repo.QueryWithEqual("parent_id", parentID),
		repo.QueryWithEqual("file_type", model.FileTypeFolder),
	)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func (d *KBDocument) UpdateSpaceFolder(ctx context.Context, kbID uint, folderID uint) error {
	doc, err := d.GetByID(ctx, kbID, folderID)
	if err != nil {
		return nil
	}

	if doc.DocType != model.DocTypeSpace || doc.FileType != model.FileTypeFolder || doc.ParentID == 0 {
		return errors.ErrUnsupported
	}

	err = d.pub.Publish(ctx, topic.TopicKBSpace, topic.MsgKBSpace{
		OP:       topic.OPUpdate,
		KBID:     kbID,
		FolderID: folderID,
	})
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("kb_id", kbID).With("folder_id", folderID).Warn("pub update msg failed")
	}

	return nil
}

func (d *KBDocument) DeleteSpaceFolder(ctx context.Context, kbID uint, folderID uint) error {
	doc, err := d.GetByID(ctx, kbID, folderID)
	if err != nil {
		return nil
	}

	if doc.DocType != model.DocTypeSpace || doc.FileType != model.FileTypeFolder || doc.ParentID == 0 {
		return errors.ErrUnsupported
	}

	err = d.pub.Publish(ctx, topic.TopicKBSpace, topic.MsgKBSpace{
		OP:       topic.OPDelete,
		KBID:     kbID,
		FolderID: folderID,
	})
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).With("kb_id", kbID).With("folder_id", folderID).Warn("pub delete msg failed")
	}

	err = d.repoDoc.Delete(ctx, repo.QueryWithEqual("kb_id", kbID), repo.QueryWithEqual("id", folderID))
	if err != nil {
		return err
	}

	return nil
}

type ListWebItem struct {
	model.Base

	Title  string          `json:"title"`
	Desc   string          `json:"desc"`
	Status model.DocStatus `json:"status"`
}

type ListWebReq struct {
	model.Pagination

	KBID  uint    `json:"kb_id" swaggerignore:"true"`
	Title *string `json:"title" form:"title"`
}

func (d *KBDocument) ListWeb(ctx context.Context, req ListWebReq) (*model.ListRes[ListWebItem], error) {
	var res model.ListRes[ListWebItem]
	err := d.repoDoc.List(ctx, &res,
		repo.QueryWithEqual("kb_id", req.KBID),
		repo.QueryWithEqual("doc_type", model.DocTypeWeb),
		repo.QueryWithPagination(&req.Pagination),
		repo.QueryWithILike("title", req.Title),
	)
	if err != nil {
		return nil, err
	}
	err = d.repoDoc.Count(ctx, &res.Total,
		repo.QueryWithEqual("kb_id", req.KBID),
		repo.QueryWithEqual("doc_type", model.DocTypeWeb),
	)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func newDocument(repoDoc *repo.KBDocument, c cache.Cache[topic.TaskMeta], doc anydoc.Anydoc, pub mq.Publisher, oc oss.Client, pa *PublicAddress) *KBDocument {
	return &KBDocument{
		repoDoc:       repoDoc,
		cache:         c,
		anydoc:        doc,
		pub:           pub,
		oc:            oc,
		svcPublicAddr: pa,
		logger:        glog.Module("svc", "kb_document"),
	}
}

func init() {
	registerSvc(newDocument)
}
