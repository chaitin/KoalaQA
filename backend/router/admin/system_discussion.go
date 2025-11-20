package admin

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type systemDiscussion struct {
	svcSysDisc *svc.SystemDiscussion
}

// Get
// @Summary system discussion detail
// @Tags system_discussion
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemDiscussion}
// @Router /admin/system/discussion [get]
func (s *systemDiscussion) Get(ctx *context.Context) {
	res, err := s.svcSysDisc.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get system discussion failed")
		return
	}

	ctx.Success(res)
}

// Put
// @Summary update system discussion config
// @Tags system_discussion
// @Accept json
// @Param req body model.SystemDiscussion true "request params"
// @Produce json
// @Success 200 {object} context.Response
// @Router /admin/system/discussion [put]
func (s *systemDiscussion) Put(ctx *context.Context) {
	var req model.SystemDiscussion
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	err = s.svcSysDisc.Update(ctx, req)
	if err != nil {
		ctx.InternalError(err, "update system discussion failed")
		return
	}

	ctx.Success(nil)
}

func (s *systemDiscussion) Route(h server.Handler) {
	g := h.Group("/system/discussion")
	g.GET("", s.Get)
	g.PUT("", s.Put)
}

func newSystemDiscussion(sysDisc *svc.SystemDiscussion) server.Router {
	return &systemDiscussion{svcSysDisc: sysDisc}
}

func init() {
	registerAdminAPIRouter(newSystemDiscussion)
}
