package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type system struct {
	info         *version.Info
	svcSysDisc   *svc.SystemDiscussion
	svcNotifySub *svc.MessageNotifySub
}

func (s *system) Route(h server.Handler) {
	g := h.Group("/system")
	g.GET("/info", s.SystemInfo)
	g.GET("/discussion", s.Discussion)
	g.GET("/notify_sub", s.ListNotifySub)
}

func newSystem(info *version.Info, sysDisc *svc.SystemDiscussion, svcNotifySub *svc.MessageNotifySub) server.Router {
	return &system{info: info, svcSysDisc: sysDisc, svcNotifySub: svcNotifySub}
}

type SystemInfoRes struct {
	Version       string `json:"version"`
	LatestVersion string `json:"latest_version"`
}

// SystemInfo
// @Summary get system info
// @Tags system
// @Produce json
// @Success 200 {object} context.Response{data=SystemInfoRes}
// @Router /system/info [get]
func (s *system) SystemInfo(ctx *context.Context) {
	ctx.Success(SystemInfoRes{
		Version:       s.info.Version(),
		LatestVersion: s.info.LatestVersion(),
	})
}

// Discussion
// @Summary system discussion detail
// @Tags system
// @Produce json
// @Success 200 {object} context.Response{data=model.SystemDiscussion}
// @Router /system/discussion [get]
func (s *system) Discussion(ctx *context.Context) {
	res, err := s.svcSysDisc.Get(ctx)
	if err != nil {
		ctx.InternalError(err, "get system discussion failed")
		return
	}

	ctx.Success(res)
}

// ListNotifySub
// @Summary list notify sub
// @Tags system
// @Produce json
// @Success 200 {object} context.Response{data=model.ListRes{items=[]model.MessageNotifySub}}
// @Router /system/notify_sub [get]
func (s *system) ListNotifySub(ctx *context.Context) {
	res, err := s.svcNotifySub.FrontendList(ctx)
	if err != nil {
		ctx.InternalError(err, "list notify sub failed")
		return
	}

	ctx.Success(res)
}

func init() {
	registerApiNoAuthRouter(newSystem)
}
