package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type konwledgeBase struct {
	kb *svc.KnowledgeBase
}

// List
// @Summary list kb
// @Tags knowledge_base
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.KBListItem}}
// @Router /admin/kb [get]
func (kb *konwledgeBase) List(ctx *context.Context) {
	res, err := kb.kb.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list kb failed")
		return
	}

	ctx.Success(res)
}

// Create
// @Summary create kb
// @Tags knowledge_base
// @Accept json
// @Param req body svc.KBCreateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/kb [post]
func (kb *konwledgeBase) Create(ctx *context.Context) {
	var req svc.KBCreateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	id, err := kb.kb.Create(ctx, req)
	if err != nil {
		ctx.InternalError(err, "create kb failed")
		return
	}

	ctx.Success(id)
}

// Update
// @Summary update kb
// @Tags knowledge_base
// @Accept json
// @Param kb_id path uint true "kb id"
// @Param req body svc.KBUpdateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id} [put]
func (kb *konwledgeBase) Update(ctx *context.Context) {
	id, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.KBUpdateReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = kb.kb.Update(ctx, id, req)
	if err != nil {
		ctx.InternalError(err, "update kb failed")
		return
	}

	ctx.Success(nil)
}

// Delete
// @Summary delete kb
// @Tags knowledge_base
// @Param kb_id path uint true "kb id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id} [delete]
func (kb *konwledgeBase) Delete(ctx *context.Context) {
	id, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = kb.kb.Delete(ctx, svc.KBDeleteReq{ID: id})
	if err != nil {
		ctx.InternalError(err, "delete kb failed")
		return
	}

	ctx.Success(nil)
}

func (kb *konwledgeBase) Route(h server.Handler) {
	g := h.Group("/kb")
	{
		g.GET("", kb.List)
		g.POST("", kb.Create)

		detailG := g.Group("/:kb_id")
		{
			detailG.PUT("", kb.Update)
			detailG.DELETE("", kb.Delete)
		}
	}
}

func newKnowledgeBase(kb *svc.KnowledgeBase) server.Router {
	return &konwledgeBase{
		kb: kb,
	}
}

func init() {
	registerAdminAPIRouter(newKnowledgeBase)
}
