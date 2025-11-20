package svc

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/batch"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type Stat struct {
	batcher  batch.Batcher[model.StatInfo]
	repoStat *repo.Stat
	repoDisc *repo.Discussion
	repoComm *repo.Comment
}

func (s *Stat) UpdateStat(ctx context.Context, key string) error {
	s.batcher.Send(model.StatInfo{
		Type: model.StatTypeVisit,
		Ts:   util.HourTrunc(time.Now()).Unix(),
		Key:  key,
	})

	return nil
}

func (s *Stat) Count(ctx context.Context, t model.StatType, req StatReq) (count int64, err error) {
	err = s.repoStat.Count(ctx, &count,
		repo.QueryWithEqual("type", t),
		repo.QueryWithEqual("ts", req.Begin, repo.EqualOPGTE),
	)

	return
}

func (s *Stat) Sum(ctx context.Context, t model.StatType, req StatReq) (count int64, err error) {
	err = s.repoStat.Sum(ctx, &count,
		repo.QueryWithEqual("type", t),
		repo.QueryWithEqual("ts", req.Begin, repo.EqualOPGTE),
	)

	return
}

func (s *Stat) UV(ctx context.Context, req StatReq) (int64, error) {
	return s.Count(ctx, model.StatTypeVisit, req)
}

func (s *Stat) PV(ctx context.Context, req StatReq) (int64, error) {
	return s.Sum(ctx, model.StatTypeVisit, req)
}

type StatReq struct {
	Begin int64 `form:"begin" binding:"required"`
}

type StateTrendGroup uint

const (
	StateTrendGroupHour = iota + 1
	StateTrendGroupDay
)

type StatTrendReq struct {
	StatReq

	StatGroup StateTrendGroup  `form:"stat_group" binding:"required"`
	StatTypes []model.StatType `form:"stat_types" binding:"required"`
}

type StatVisitRes struct {
	UV int64 `json:"uv"`
	PV int64 `json:"pv"`
}

func (s *Stat) Visit(ctx context.Context, req StatReq) (*StatVisitRes, error) {
	uv, err := s.UV(ctx, req)
	if err != nil {
		return nil, err
	}

	pv, err := s.PV(ctx, req)
	if err != nil {
		return nil, err
	}

	return &StatVisitRes{
		UV: uv,
		PV: pv,
	}, nil
}

func (s *Stat) SearchCount(ctx context.Context, req StatReq) (int64, error) {
	return s.Sum(ctx, model.StatTypeSearch, req)
}

func (s *Stat) Accept(ctx context.Context, onlyBot bool, req StatReq) (count int64, err error) {
	query := []repo.QueryOptFunc{
		repo.QueryWithEqual("parent_id", 0),
		repo.QueryWithEqual("accepted", true),
		repo.QueryWithEqual("updated_at", time.Unix(req.Begin, 0), repo.EqualOPGTE),
	}

	if onlyBot {
		query = append(query, repo.QueryWithEqual("bot", true))
	}

	err = s.repoComm.Count(ctx, &count, query...)

	return
}

func (s *Stat) HumanResponseTime(ctx context.Context, req StatReq) (int64, error) {
	var stats []model.Stat
	err := s.repoStat.List(ctx, &stats,
		repo.QueryWithEqual("type", model.StatTypeBotUnknown),
		repo.QueryWithEqual("ts", req.Begin, repo.EqualOPGTE),
	)
	if err != nil {
		return 0, err
	}

	discUUIDs := make(model.StringArray, len(stats))
	for i := range stats {
		discUUIDs[i] = stats[i].Key
	}

	if len(discUUIDs) == 0 {
		return 0, nil
	}

	var discs []model.Discussion
	err = s.repoDisc.List(ctx, &discs,
		repo.QueryWithEqual("uuid", discUUIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		return 0, err
	}

	if len(discs) == 0 {
		return 0, nil
	}

	discIDs := make(model.Int64Array, len(discs))
	for i := range discs {
		discIDs[i] = int64(discs[i].ID)
	}

	discComms, err := s.repoComm.ListFirstHuman(ctx, discIDs)
	if err != nil {
		return 0, err
	}

	if len(discComms) == 0 {
		return 0, nil
	}

	total := int64(0)

	m := make(map[uint]int64)

	for _, discComm := range discComms {
		m[discComm.ID] = int64(discComm.CreatedAt)
	}

	for _, disc := range discs {
		comm, ok := m[disc.ID]
		if !ok {
			continue
		}

		total = total + comm - int64(disc.CreatedAt)
	}

	return total, nil
}

// StatDiscussionItem only use in swagger
type StatDiscussionItem struct {
	Key   model.DiscussionType `json:"key"`
	Count int64                `json:"count"`
}

type StatDiscussionRes struct {
	Discussions   []model.Count[model.DiscussionType] `json:"discussions" swaggerignore:"true"`
	BotUnknown    int64                               `json:"bot_unknown"`
	Accept        int64                               `json:"accept"`
	BotAccept     int64                               `json:"bot_accept"`
	HumanRespTime int64                               `json:"human_resp_time"`
}

func (s *Stat) Discussion(ctx context.Context, req StatReq) (*StatDiscussionRes, error) {
	var res StatDiscussionRes
	t := time.Unix(req.Begin, 0)
	var err error
	res.Discussions, err = s.repoDisc.ListType(ctx,
		repo.QueryWithEqual("created_at", util.DayTrunc(t), repo.EqualOPGTE),
	)
	if err != nil {
		return nil, err
	}

	err = s.repoStat.BotUnknown(ctx, &res.BotUnknown, t)
	if err != nil {
		return nil, err
	}

	res.Accept, err = s.Accept(ctx, false, req)
	if err != nil {
		return nil, err
	}
	res.BotAccept, err = s.Accept(ctx, true, req)
	if err != nil {
		return nil, err
	}

	res.HumanRespTime, err = s.HumanResponseTime(ctx, req)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type StatTrendItem struct {
	Type  model.StatType `json:"type"`
	Ts    int64          `json:"ts"`
	Count int64          `json:"count"`
}

func (s *Stat) Trend(ctx context.Context, req StatTrendReq) (*model.ListRes[model.StatTrend], error) {
	var (
		res model.ListRes[model.StatTrend]
		err error
	)

	queryFuncs := []repo.QueryOptFunc{
		repo.QueryWithEqual("ts", req.Begin, repo.EqualOPGTE),
		repo.QueryWithEqual("type", req.StatTypes, repo.EqualOPIn),
	}

	switch req.StatGroup {
	case StateTrendGroupHour:
		res.Items, err = s.repoStat.Trend(ctx, queryFuncs...)
	case StateTrendGroupDay:
		res.Items, err = s.repoStat.TrendDay(ctx, queryFuncs...)
	default:
		err = errors.New("unsupported stat group")
	}
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))

	return &res, nil
}

func newStat(batcher batch.Batcher[model.StatInfo], s *repo.Stat, disc *repo.Discussion, comm *repo.Comment) *Stat {
	return &Stat{batcher: batcher, repoStat: s, repoDisc: disc, repoComm: comm}
}

func init() {
	registerSvc(newStat)
}
