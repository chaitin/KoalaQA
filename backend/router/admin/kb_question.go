package admin

import (
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type kbQuestion struct {
	svc *svc.KBDocument
}

// List
// @Summary list kb question
// @Tags question
// @Param kb_id path uint true "kb_id"
// @Param req query svc.DocListReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.DocListItem}}
// @Router /admin/kb/{kb_id}/question [get]
func (q *kbQuestion) List(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	if kbID == 0 {
		ctx.BadRequest(errors.New("kb_id is required"))
		return
	}

	var req svc.DocListReq
	err = ctx.ShouldBindQuery(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := q.svc.List(ctx, kbID, model.DocTypeQuestion, req)
	if err != nil {
		ctx.InternalError(err, "list question failed")
		return
	}

	ctx.Success(res)
}

// Create
// @Summary create kb question
// @Tags question
// @Accept json
// @Param kb_id path uint true "kb_id"
// @Param req body svc.DocCreateQAReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/kb/{kb_id}/question [post]
func (q *kbQuestion) Create(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	var req svc.DocCreateQAReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := q.svc.CreateQA(ctx, kbID, req)
	if err != nil {
		ctx.InternalError(err, "create question failed")
		return
	}

	ctx.Success(res)
}

// Detail
// @Summary kb question detail
// @Tags question
// @Param kb_id path uint true "kb_id"
// @Param qa_id path uint true "qa_id"
// @Produce json
// @Success 200 {object} context.Response{data=model.KBDocumentDetail}
// @Router /admin/kb/{kb_id}/question/{qa_id} [get]
func (q *kbQuestion) Detail(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	qaID, err := ctx.ParamUint("qa_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := q.svc.Detail(ctx, kbID, qaID)
	if err != nil {
		ctx.InternalError(err, "get question detail failed")
		return
	}

	ctx.Success(res)
}

// Update
// @Summary update kb question
// @Tags question
// @Param kb_id path uint true "kb_id"
// @Param qa_id path uint true "qa_id"
// @Param req body svc.DocUpdateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/question/{qa_id} [put]
func (q *kbQuestion) Update(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	qaID, err := ctx.ParamUint("qa_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.DocUpdateReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = q.svc.Update(ctx, kbID, qaID, req)
	if err != nil {
		ctx.InternalError(err, "update question failed")
		return
	}

	ctx.Success(nil)
}

// Delete
// @Summary delete kb question
// @Tags question
// @Param kb_id path uint true "kb_id"
// @Param qa_id path uint true "qa_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/question/{qa_id} [delete]
func (q *kbQuestion) Delete(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	qaID, err := ctx.ParamUint("qa_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = q.svc.Delete(ctx, kbID, qaID)
	if err != nil {
		ctx.InternalError(err, "delete question failed")
		return
	}

	ctx.Success(nil)
}

// UploadFile
// @Summary upload kb question assets
// @Tags question
// Accept multipart/formdata
// @Param kb_id path uint true "kb_id"
// @Param file formData file true "upload file"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/question/file [post]
func (q *kbQuestion) UploadFile(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	var req svc.UploadFileReq
	err = ctx.ShouldBind(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	path, err := q.svc.UploadFile(ctx, kbID, req)
	if err != nil {
		ctx.InternalError(err, "upload file failed")
		return
	}
	ctx.Success(path)
}

// Review
// @Summary review kb question
// @Tags question
// @Param kb_id path uint true "kb_id"
// @Param qa_id path uint true "qa_id"
// @Param req body svc.ReviewReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/question/{qa_id}/review [post]
func (q *kbQuestion) Review(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	qaID, err := ctx.ParamUint("qa_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	var req svc.ReviewReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}
	req.KBID = kbID
	req.QAID = qaID
	err = q.svc.Review(ctx, req)
	if err != nil {
		ctx.InternalError(err, "review question failed")
		return
	}
	ctx.Success(nil)
}

func (q *kbQuestion) Route(h server.Handler) {
	g := h.Group("/kb/:kb_id/question")
	{
		g.GET("", q.List)
		g.POST("", q.Create)
		g.POST("/file", q.UploadFile)
		detailG := g.Group("/:qa_id")
		{
			detailG.GET("", q.Detail)
			detailG.PUT("", q.Update)
			detailG.DELETE("", q.Delete)
			detailG.POST("/review", q.Review)
		}
	}
}

func newKBQuestion(kbDoc *svc.KBDocument) server.Router {
	return &kbQuestion{svc: kbDoc}
}

func init() {
	registerAdminAPIRouter(newKBQuestion)
}
