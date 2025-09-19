package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type kbSpace struct {
	svcDoc *svc.KBDocument
}

// ListSpace
// @Summary list kb space
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.ListSpaceItem}}
// @Router /admin/kb/{kb_id}/space [get]
func (s *kbSpace) ListSpace(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := s.svcDoc.ListSpace(ctx, kbID)
	if err != nil {
		ctx.InternalError(err, "list space failed")
		return
	}

	ctx.Success(res)
}

// CreateSpace
// @Summary create kb space
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Accept json
// @Param req body svc.CreateSpaceReq true "request param"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/kb/{kb_id}/space [post]
func (s *kbSpace) CreateSpace(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.CreateSpaceReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	docID, err := s.svcDoc.CreateSpace(ctx, kbID, req)
	if err != nil {
		ctx.InternalError(err, "create space failed")
		return
	}

	ctx.Success(docID)
}

// UpdateSpace
// @Summary update kb space
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Accept json
// @Param req body svc.UpdateSpaceReq true "request param"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/space/{space_id} [put]
func (s *kbSpace) UpdateSpace(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	spaceID, err := ctx.ParamUint("space_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	var req svc.UpdateSpaceReq
	err = ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcDoc.UpdateSpace(ctx, kbID, spaceID, req)
	if err != nil {
		ctx.InternalError(err, "update space failed")
		return
	}

	ctx.Success(nil)
}

// DeleteSpace
// @Summary delete kb space
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/space/{space_id} [delete]
func (s *kbSpace) DeleteSpace(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	spaceID, err := ctx.ParamUint("space_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcDoc.DeleteSpace(ctx, kbID, spaceID)
	if err != nil {
		ctx.InternalError(err, "delete space failed")
		return
	}

	ctx.Success(nil)
}

// GetSpace
// @Summary get kb space detail
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Produce json
// @Success 200 {object} context.Response{data=svc.GetSpaceRes{platform_opt=model.PlatformOpt}}
// @Router /admin/kb/{kb_id}/space/{space_id} [get]
func (s *kbSpace) GetSpace(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	spaceID, err := ctx.ParamUint("space_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := s.svcDoc.GetSpace(ctx, kbID, spaceID)
	if err != nil {
		ctx.InternalError(err, "get space failed")
		return
	}

	ctx.Success(res)
}

// ListSpaceFolder
// @Summary list kb space folder
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]svc.ListSpaceFolderItem}}
// @Router /admin/kb/{kb_id}/space/{space_id}/folder [get]
func (s *kbSpace) ListSpaceFolder(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	spaceID, err := ctx.ParamUint("space_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := s.svcDoc.ListSpaceFolder(ctx, kbID, spaceID)
	if err != nil {
		ctx.InternalError(err, "list space folder failed")
		return
	}

	ctx.Success(res)
}

// DeleteSpaceFolder
// @Summary delete kb space folder
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Param folder_id path uint true "folder_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/space/{space_id}/folder/{folder_id} [delete]
func (s *kbSpace) DeleteSpaceFolder(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	folderID, err := ctx.ParamUint("folder_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcDoc.DeleteSpaceFolder(ctx, kbID, folderID)
	if err != nil {
		ctx.InternalError(err, "delete space folder failed")
		return
	}

	ctx.Success(nil)
}

// UpdateSpaceFolder
// @Summary update kb space folder
// @Tags space
// @Param kb_id path uint true "kb_id"
// @Param space_id path uint true "space_id"
// @Param folder_id path uint true "folder_id"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/kb/{kb_id}/space/{space_id}/folder/{folder_id} [put]
func (s *kbSpace) UpdateSpaceFolder(ctx *context.Context) {
	kbID, err := ctx.ParamUint("kb_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	folderID, err := ctx.ParamUint("folder_id")
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcDoc.UpdateSpaceFolder(ctx, kbID, folderID)
	if err != nil {
		ctx.InternalError(err, "update space fplder failed")
		return
	}

	ctx.Success(nil)
}

func (s *kbSpace) Route(h server.Handler) {
	g := h.Group("/kb/:kb_id/space")
	g.GET("", s.ListSpace)
	g.POST("", s.CreateSpace)
	{
		detailG := g.Group("/:space_id")
		detailG.GET("", s.GetSpace)
		detailG.PUT("", s.UpdateSpace)
		detailG.DELETE("", s.DeleteSpace)
		{
			spaceFolderG := detailG.Group("/folder")
			spaceFolderG.GET("", s.ListSpaceFolder)
			{
				spaceFolderDetailG := spaceFolderG.Group("/:folder_id")
				spaceFolderDetailG.PUT("")
				spaceFolderDetailG.DELETE("", s.DeleteSpaceFolder)
			}
		}
	}
}

func newKBSpace(kbDoc *svc.KBDocument) server.Router {
	return &kbSpace{svcDoc: kbDoc}
}

func init() {
	registerAdminAPIRouter(newKBSpace)
}
