package svc

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"slices"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/anydoc"
	"github.com/chaitin/koalaqa/pkg/anydoc/platform"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
)

type baseExportReq struct {
	DBDocID uint   `json:"-"`
	KBID    uint   `json:"kb_id" binding:"required"`
	UUID    string `json:"uuid" binding:"required"`
	DocID   string `json:"doc_id" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Desc    string `json:"desc"`
}

type KBDocument struct {
	repoDoc       *repo.KBDocument
	cache         cache.Cache[topic.TaskMeta]
	svcPublicAddr *PublicAddress
	anydoc        anydoc.Anydoc
	pub           mq.Publisher
	oc            oss.Client
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
	baseExportReq
	FileType string `json:"file_type" binding:"required"`
	SpaceID  string `json:"space_id" binding:"required"`
}

func (d *KBDocument) FeishuExport(ctx context.Context, req FeishuExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformFeishu, req.baseExportReq, anydoc.ExportWithFeishu(req.SpaceID, req.FileType))
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
	baseExportReq
}

func (d *KBDocument) YuQueExport(ctx context.Context, req YuQueExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformYuQue, req.baseExportReq)
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
	baseExportReq
}

func (d *KBDocument) FileExport(ctx context.Context, req FileExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformFile, req.baseExportReq)
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
	baseExportReq
}

func (d *KBDocument) URLExport(ctx context.Context, req URLExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformURL, req.baseExportReq)
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
	baseExportReq
}

func (d *KBDocument) SitemapExport(ctx context.Context, req SitemapExportReq) (string, error) {
	return d.exportWithCache(ctx, platform.PlatformSitemap, req.baseExportReq)
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

func (d *KBDocument) exportWithCache(ctx context.Context, platform platform.PlatformType, baseInfo baseExportReq, optFuncs ...anydoc.ExportFunc) (string, error) {
	o := anydoc.GetExportOpt(optFuncs...)
	taskID, err := d.anydoc.Export(ctx, platform, baseInfo.UUID, baseInfo.DocID, anydoc.ExportWithOpt(o))
	if err != nil {
		return "", err
	}

	d.cache.Set(taskID, topic.TaskMeta{
		DBDocID:   baseInfo.DBDocID,
		KBID:      baseInfo.KBID,
		Title:     baseInfo.Title,
		Platform:  platform,
		Desc:      baseInfo.Desc,
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

	return d.exportWithCache(ctx, doc.Platform, baseExportReq{
		DBDocID: doc.ID,
		KBID:    kbID,
		UUID:    listRes.UUID,
		DocID:   doc.DocID,
		Title:   doc.Title,
		Desc:    doc.Desc,
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

func newDocument(repoDoc *repo.KBDocument, c cache.Cache[topic.TaskMeta], doc anydoc.Anydoc, pub mq.Publisher, oc oss.Client, pa *PublicAddress) *KBDocument {
	return &KBDocument{
		repoDoc:       repoDoc,
		cache:         c,
		anydoc:        doc,
		pub:           pub,
		oc:            oc,
		svcPublicAddr: pa,
	}
}

func init() {
	registerSvc(newDocument)
}
