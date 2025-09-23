package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type kbWeb struct {
	svcDoc *svc.KBDocument
}

// List
// @Summary list kb web
// @Tags web
// @Param req query svc.ListWebReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.ListWebItem}}
// @Router /admin/kb/{kb_id}/web [get]
func (w *kbWeb) List(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	var req svc.ListWebReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	req.KBID = kbID
	res, err := w.svcDoc.ListWeb(ctx, req)
	if err != nil {
		ctx.InternalError(err, "list web failed")
		return
	}
	ctx.Success(res)
}

// Update
// @Summary update kb web
// @Tags web
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response{data=string}
// @Router /admin/kb/{kb_id}/web/{doc_id} [put]
func (w *kbWeb) Update(ctx *context.Context) {
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

	taskID, err := w.svcDoc.UpdateByPlatform(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "update kb web failed")
		return
	}

	ctx.Success(taskID)
}

// Delete
// @Summary delete kb web
// @Tags web
// @Param kb_id path uint true "kb_id"
// @Param doc_id path uint true "doc_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/web/{doc_id} [delete]
func (w *kbWeb) Delete(ctx *context.Context) {
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
	err = w.svcDoc.Delete(ctx, kbID, docID)
	if err != nil {
		ctx.InternalError(err, "delete kb web failed")
		return
	}

	ctx.Success(nil)
}

func (w *kbWeb) Route(h server.Handler) {
	g := h.Group("/kb/:kb_id/web")
	g.GET("", w.List)
	g.PUT("/:doc_id", w.Update)
	g.DELETE("/:doc_id", w.Delete)
}

func newKbWeb(svcDoc *svc.KBDocument) server.Router {
	return &kbWeb{svcDoc: svcDoc}
}

func init() {
	registerAdminAPIRouter(newKbWeb)
}
