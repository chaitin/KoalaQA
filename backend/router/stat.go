package router

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type stat struct {
	svcStat *svc.Stat
}

// Stat
// @Summary stat
// @Tags stat
// @Produce json
// @Success 200 {object} context.Response
// @Router /stat [post]
func (s *stat) Stat(ctx *context.Context) {
	err := s.svcStat.UpdateStat(ctx, ctx.SessionUUID())
	if err != nil {
		ctx.InternalError(err, "update stat failed")
	}

	ctx.Success(nil)
}

func (s *stat) Route(h server.Handler) {
	g := h.Group("/stat")
	g.POST("", s.Stat)
}

func newStat(s *svc.Stat) server.Router {
	return &stat{svcStat: s}
}

func init() {
	registerGlobalRouter(newStat)
}
