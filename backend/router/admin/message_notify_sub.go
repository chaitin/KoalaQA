package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type messageNotifySub struct {
	svcNotifySub *svc.MessageNotifySub
}

// List
// @Summary list message notify sub
// @Tags message_notify_sub
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.MessageNotifySub{info=model.MessageNotifySubInfo}}}
// @Router /admin/system/notify_sub [get]
func (s *messageNotifySub) List(ctx *context.Context) {
	res, err := s.svcNotifySub.List(ctx)
	if err != nil {
		ctx.InternalError(err, "list notify sub failed")
		return
	}

	ctx.Success(res)
}

// Upsert
// @Summary upsert message notify sub
// @Tags message_notify_sub
// @Accept json
// @Param req body svc.MessageNotifySubCreateReq true "request params"
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/system/notify_sub [post]
func (s *messageNotifySub) Upsert(ctx *context.Context) {
	var req svc.MessageNotifySubCreateReq
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.BadRequest(err)
		return
	}

	res, err := s.svcNotifySub.Upsert(ctx, req)
	if err != nil {
		ctx.InternalError(err, "upsert notify sub failed")
		return
	}

	ctx.Success(res)
}

func (s *messageNotifySub) Route(h server.Handler) {
	g := h.Group("/system/notify_sub")
	g.GET("", s.List)
	g.POST("", s.Upsert)
}

func newMessageNotifySub(s *svc.MessageNotifySub) server.Router {
	return &messageNotifySub{svcNotifySub: s}
}

func init() {
	registerAdminAPIRouter(newMessageNotifySub)
}
