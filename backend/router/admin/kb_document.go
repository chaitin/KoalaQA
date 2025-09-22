package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type kbDocument struct {
	svcDoc *svc.KBDocument
}

// FileList
// @Summary list file documents
// @Tags document
// @Accept multipart/form-data
// @Param file formData file true "upload file"
// @Produce json
// @Success 200 {object} context.Response{data=anydoc.ListRes}
// @Router /admin/kb/document/file/list [post]
func (d *kbDocument) FileList(ctx *context.Context) {
	var req svc.FileListReq

	err := ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.FileList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "file list failed")
		return
	}

	ctx.Success(res)
}

// FileExport
// @Summary export file document
// @Tags document
// @Accept json
// @Param req body svc.FileExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/file/export [post]
func (d *kbDocument) FileExport(ctx *context.Context) {
	var req svc.FileExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.FileExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "file export failed")
		return
	}

	ctx.Success(res)
}

// URLList
// @Summary list url documents
// @Tags document
// @Accept json
// @Param req body svc.URLListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=anydoc.ListRes}
// @Router /admin/kb/document/url/list [post]
func (d *kbDocument) URLList(ctx *context.Context) {
	var req svc.URLListReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.URLList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "url list failed")
		return
	}

	ctx.Success(res)
}

// URLExport
// @Summary export url document
// @Tags document
// @Accept json
// @Param req body svc.URLExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/url/export [post]
func (d *kbDocument) URLExport(ctx *context.Context) {
	var req svc.URLExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.URLExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "url export failed")
		return
	}

	ctx.Success(res)
}

// SitemapList
// @Summary list sitemap documents
// @Tags document
// @Accept json
// @Param req body svc.SitemapListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=anydoc.ListRes}
// @Router /admin/kb/document/sitemap/list [post]
func (d *kbDocument) SitemapList(ctx *context.Context) {
	var req svc.SitemapListReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.SitemapList(ctx, req)
	if err != nil {
		ctx.InternalError(err, "sitemap list failed")
		return
	}

	ctx.Success(res)
}

// SitemapExport
// @Summary export sitemap document
// @Tags document
// @Accept json
// @Param req body svc.SitemapExportReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/document/sitemap/export [post]
func (d *kbDocument) SitemapExport(ctx *context.Context) {
	var req svc.SitemapExportReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.SitemapExport(ctx, req)
	if err != nil {
		ctx.InternalError(err, "sitemap export failed")
		return
	}

	ctx.Success(res)
}

// Task
// @Summary get task info
// @Tags document
// @Param req body svc.TaskReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=[]topic.TaskMeta}
// @Router /admin/kb/document/task [post]
func (d *kbDocument) Task(ctx *context.Context) {
	var req svc.TaskReq

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.Task(ctx, req)
	if err != nil {
		ctx.InternalError(err, "find task failed")
		return
	}

	ctx.Success(res)
}

// List
// @Summary list kb document
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param req query svc.DocListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.DocListItem}}
// @Router /admin/kb/{kb_id}/document [get]
func (d *kbDocument) List(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.DocListReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	res, err := d.svcDoc.List(ctx, kbID, model.DocTypeDocument, req)
	if err != nil {
		ctx.InternalError(err, "list kb doc failed")
		return
	}

	ctx.Success(res)
}

// Detail
// @Summary get kb document detail
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response{data=model.KBDocumentDetail}
// @Router /admin/kb/{kb_id}/document/{doc_id} [get]
func (d *kbDocument) Detail(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	docID, err := ctx.ParamUint("doc_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := d.svcDoc.Detail(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "get kb document detail failed")
		return
	}

	ctx.Success(res)
}

// Delete
// @Summary delete kb document
// @Tags document
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/document/{doc_id} [delete]
func (d *kbDocument) Delete(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	docID, err := ctx.ParamUint("doc_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = d.svcDoc.Delete(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "delete document failed")
		return
	}

	ctx.Success(nil)
}

func newDocument(d *svc.KBDocument) server.Router {
	return &kbDocument{
		svcDoc: d,
	}
}

func (d *kbDocument) Route(e server.Handler) {
	{
		pageG := e.Group("/kb/:kb_id/document")
		pageG.GET("", d.List)
		pageG.GET("/:doc_id", d.Detail)
		pageG.DELETE("/:doc_id", d.Delete)
	}

	{
		g := e.Group("/kb/document")
		g.POST("/file/list", d.FileList)
		g.POST("/file/export", d.FileExport)

		g.POST("/url/list", d.URLList)
		g.POST("/url/export", d.URLExport)

		g.POST("/sitemap/list", d.SitemapList)
		g.POST("/sitemap/export", d.SitemapExport)

		g.POST("/task", d.Task)
	}

}

func init() {
	registerAdminAPIRouter(newDocument)
}
