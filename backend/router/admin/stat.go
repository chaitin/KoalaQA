package admin

import (
	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/server"
	"github.com/chaitin/koalaqa/svc"
)

type stat struct {
	svcStat *svc.Stat
}

// Visit
// @Summary stat visit
// @Tags stat
// @Produce json
// @Success 200 {object} context.Response{data=svc.StatVisitRes}
// @Router /admin/stat/visit [get]
func (s *stat) Visit(ctx *context.Context) {
	res, err := s.svcStat.Visit(ctx)
	if err != nil {
		ctx.InternalError(err, "stat visit failed")
		return
	}

	ctx.Success(res)
}

// SearchCoount
// @Summary stat search count
// @Tags stat
// @Produce json
// @Success 200 {object} context.Response{data=uint}
// @Router /admin/stat/search [get]
func (s *stat) SearchCoount(ctx *context.Context) {
	res, err := s.svcStat.SearchCount(ctx)
	if err != nil {
		ctx.InternalError(err, "stat search count failed")
		return
	}

	ctx.Success(res)
}

// Discussion
// @Summary stat discussion
// @Tags stat
// @Produce json
// @Success 200 {object} context.Response{data=svc.StatDiscussionRes{discussions=[]svc.StatDiscussionItem}}
// @Router /admin/stat/discussion [get]
func (s *stat) Discussion(ctx *context.Context) {
	res, err := s.svcStat.Discussion(ctx)
	if err != nil {
		ctx.InternalError(err, "stat discussion failed")
		return
	}

	ctx.Success(res)
}

func (s *stat) Route(h server.Handler) {
	g := h.Group("/stat")
	g.GET("/visit", s.Visit)
	g.GET("/search", s.SearchCoount)
	g.GET("/discussion", s.Discussion)
}

func newStat(s *svc.Stat) server.Router {
	return &stat{svcStat: s}
}

func init() {
	registerAdminAPIRouter(newStat)
}
