package svc

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type Rank struct {
	repoRank          *repo.Rank
	repoUser          *repo.User
	repoDiscAIInsight *repo.DiscussionAIInsight
	repoHotQuestion   *repo.HotQuestion
	svcBot            *Bot
}

type RankContributeItem struct {
	ID     uint    `json:"id"`
	Name   string  `json:"name"`
	Avatar string  `json:"avatar"`
	Score  float64 `json:"score"`
}

type ListContributeReq struct {
	Type model.RankType `form:"type" binding:"required,oneof=1 3"`
}

func (r *Rank) Contribute(ctx context.Context, req ListContributeReq) (*model.ListRes[RankContributeItem], error) {
	var res model.ListRes[RankContributeItem]

	switch req.Type {
	case model.RankTypeContribute:
		err := r.repoRank.ListContribute(ctx, &res.Items, req.Type)
		if err != nil {
			return nil, err
		}
	case model.RankTypeAllContribute:
		bot, err := r.svcBot.Get(ctx)
		if err != nil {
			return nil, err
		}

		err = r.repoUser.List(ctx, &res.Items,
			repo.QueryWithSelectColumn("id", "name", "avatar", "point AS score"),
			repo.QueryWithPagination(&model.Pagination{
				Size: 5,
			}),
			repo.QueryWithEqual("id", bot.UserID, repo.EqualOPNE),
			repo.QueryWithEqual("point", 0, repo.EqualOPGT),
			repo.QueryWithOrderBy("point DESC, id ASC"),
		)
		if err != nil {
			return nil, err
		}
	}

	return &res, nil
}

type UpdateContributeReq struct {
	Type model.RankType
}

func (r *Rank) UpdateContribute(ctx context.Context, req UpdateContributeReq) error {
	return r.repoRank.RefresContribute(ctx, req.Type)
}

func (r *Rank) AIInsight(ctx context.Context) ([]model.RankTimeGroup, error) {
	now := time.Now()
	return r.repoRank.GroupByTime(ctx, "week", 3,
		repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -21)), repo.EqualOPGTE),
	)
}

type AIInsightDiscussionItem struct {
	model.DiscussionAIInsight

	Deleted bool `json:"deleted"`
}

func (r *Rank) AIInsightDiscussion(ctx context.Context, aiInsightID uint) (*model.ListRes[AIInsightDiscussionItem], error) {
	var res model.ListRes[AIInsightDiscussionItem]
	err := r.repoDiscAIInsight.ListByRank(ctx, &res.Items, aiInsightID)
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

type ListHotQuestionReq struct {
	Count int `form:"count,default=3"`
}

func (r *Rank) ListHotQuesion(ctx context.Context, req ListHotQuestionReq) ([]model.RankTimeGroup, error) {
	now := time.Now()
	return r.repoRank.GroupByTime(ctx, "week", req.Count,
		repo.QueryWithEqual("type", model.RankTypeHotQuestion),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -21)), repo.EqualOPGTE),
	)
}

type ListHotQuestionItemReq struct {
	*model.Pagination
}

func (r *Rank) ListHostQuesionItem(ctx context.Context, rankID uint, req ListHotQuestionItemReq) (*model.ListRes[model.HotQuestion], error) {
	var rank model.Rank
	err := r.repoRank.GetByID(ctx, &rank, rankID)
	if err != nil {
		return nil, err
	}

	var res model.ListRes[model.HotQuestion]
	err = r.repoHotQuestion.List(ctx, &res.Items,
		repo.QueryWithPagination(req.Pagination),
		repo.QueryWithEqual("group_id", rank.Extra),
		repo.QueryWithOrderBy("created_at DESC,id DESC"),
	)
	if err != nil {
		return nil, err
	}

	err = r.repoHotQuestion.Count(ctx, &res.Total, repo.QueryWithEqual("group_id", rank.ForeignID))
	if err != nil {
		return nil, err
	}

	return &res, nil
}

type ListInvalidKnowledgeReq struct {
	Count int `form:"count,default=10"`
}

func (r *Rank) ListInvalidKnowledge(ctx context.Context, req ListInvalidKnowledgeReq) ([]model.RankTimeGroup, error) {
	now := time.Now()
	return r.repoRank.GroupByTime(ctx, "month", req.Count,
		repo.QueryWithEqual("type", model.RankTypeInvalidKnowledge),
		repo.QueryWithEqual("created_at", util.MonthTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.MonthTrunc(now.AddDate(0, -3, 0)), repo.EqualOPGTE),
	)
}

type LastHotQuestionsItem struct {
	Content string `json:"content"`
}

func (r *Rank) LastHotQuestions(ctx context.Context) (*model.ListRes[LastHotQuestionsItem], error) {
	var res model.ListRes[LastHotQuestionsItem]
	err := r.repoRank.LastHotQuestions(ctx, &res.Items, repo.QueryWithSelectColumn("score_id AS content"))
	if err != nil {
		return nil, err
	}

	res.Total = int64(len(res.Items))
	return &res, nil
}

func newRank(r *repo.Rank, user *repo.User, bot *Bot, discAIInsight *repo.DiscussionAIInsight, hotQuesion *repo.HotQuestion) *Rank {
	return &Rank{
		repoRank:          r,
		repoDiscAIInsight: discAIInsight,
		repoUser:          user,
		svcBot:            bot,
		repoHotQuestion:   hotQuesion,
	}
}

func init() {
	registerSvc(newRank)
}
