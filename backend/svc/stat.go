package svc

import (
	"context"
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
		Ts:   util.TodayZero().Unix(),
		Key:  key,
	})

	return nil
}

func (s *Stat) Count(ctx context.Context, t model.StatType) (count int64, err error) {
	err = s.repoStat.Count(ctx, &count,
		repo.QueryWithEqual("type", t),
		repo.QueryWithEqual("ts", util.TodayZero().Unix()),
	)

	return
}

func (s *Stat) Sum(ctx context.Context, t model.StatType) (count int64, err error) {
	err = s.repoStat.Sum(ctx, &count,
		repo.QueryWithEqual("type", t),
		repo.QueryWithEqual("ts", util.TodayZero().Unix()),
	)

	return
}

func (s *Stat) UV(ctx context.Context) (int64, error) {
	return s.Count(ctx, model.StatTypeVisit)
}

func (s *Stat) PV(ctx context.Context) (int64, error) {
	return s.Sum(ctx, model.StatTypeVisit)
}

type StatVisitRes struct {
	UV int64 `json:"uv"`
	PV int64 `json:"pv"`
}

func (s *Stat) Visit(ctx context.Context) (*StatVisitRes, error) {
	uv, err := s.UV(ctx)
	if err != nil {
		return nil, err
	}

	pv, err := s.PV(ctx)
	if err != nil {
		return nil, err
	}

	return &StatVisitRes{
		UV: uv,
		PV: pv,
	}, nil
}

func (s *Stat) SearchCount(ctx context.Context) (int64, error) {
	return s.Sum(ctx, model.StatTypeSearch)
}

func (s *Stat) Accept(ctx context.Context, onlyBot bool) (count int64, err error) {
	now := time.Now()

	query := []repo.QueryOptFunc{
		repo.QueryWithEqual("parent_id", 0),
		repo.QueryWithEqual("accepted", true),
		repo.QueryWithEqual("updated_at", util.DayZero(now), repo.EqualOPGTE),
		repo.QueryWithEqual("updated_at", util.DayZero(now.AddDate(0, 0, 1)), repo.EqualOPLT),
	}

	if onlyBot {
		query = append(query, repo.QueryWithEqual("bot", true))
	}

	err = s.repoComm.Count(ctx, &count, query...)

	return
}

func (s *Stat) HumanResponseTime(ctx context.Context) (int64, error) {
	var stats []model.Stat
	err := s.repoStat.List(ctx, &stats,
		repo.QueryWithEqual("type", model.StatTypeBotUnknown),
		repo.QueryWithEqual("ts", util.TodayZero().Unix()),
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

func (s *Stat) Discussion(ctx context.Context) (*StatDiscussionRes, error) {
	var res StatDiscussionRes
	now := time.Now()
	var err error
	res.Discussions, err = s.repoDisc.ListType(ctx,
		repo.QueryWithEqual("created_at", util.DayZero(now), repo.EqualOPGTE),
		repo.QueryWithEqual("created_at", util.DayZero(now.AddDate(0, 0, 1)), repo.EqualOPLT),
	)
	if err != nil {
		return nil, err
	}

	err = s.repoStat.BotUnknown(ctx, &res.BotUnknown, util.TodayZero())
	if err != nil {
		return nil, err
	}

	res.Accept, err = s.Accept(ctx, false)
	if err != nil {
		return nil, err
	}
	res.BotAccept, err = s.Accept(ctx, true)
	if err != nil {
		return nil, err
	}

	res.HumanRespTime, err = s.HumanResponseTime(ctx)
	if err != nil {
		return nil, err
	}

	return &res, nil
}

func newStat(batcher batch.Batcher[model.StatInfo], s *repo.Stat, disc *repo.Discussion, comm *repo.Comment) *Stat {
	return &Stat{batcher: batcher, repoStat: s, repoDisc: disc, repoComm: comm}
}

func init() {
	registerSvc(newStat)
}
