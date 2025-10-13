package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/chaitin/koalaqa/server"
)

type system struct {
	info *version.Info
}

func (s *system) Route(h server.Handler) {
	g := h.Group("/system")
	g.GET("/info", s.SystemInfo)
}

func newSystem(info *version.Info) server.Router {
	return &system{info: info}
}

type SystemInfoRes struct {
	Version string `json:"version"`
}

// SystemInfo
// @Summary get system info
// @Tags system
// @Produce json
// @Success 200 {object} context.Response{data=SystemInfoRes}
// @Router /system/info [get]
func (s *system) SystemInfo(ctx *context.Context) {
	ctx.Success(SystemInfoRes{
		Version: s.info.Version(),
	})
}

func init() {
	registerApiNoAuthRouter(newSystem)
}
