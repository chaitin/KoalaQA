package cron

import (
	"context"
	"errors"
	"math"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type aiInsight2RankIn struct {
	fx.In

	LLM           *svc.LLM
	SvcDisc       *svc.Discussion
	SvcForum      *svc.Forum
	RepoRank      *repo.Rank
	RepoStat      *repo.Stat
	RepoComm      *repo.Comment
	Rag           rag.Service
	RepoAIInsight *repo.AIInsight
}

type aiInsight2Rank struct {
	logger *glog.Logger

	aiInsight2RankIn
}

func (i *aiInsight2Rank) Period() string {
	return "0 0 2 * * MON"
}

func (i *aiInsight2Rank) Run() {
	ctx := context.Background()
	now := time.Now()

	i.logger.Info("ai insight to rank task begin...")

	var aiInsights []model.AIInsight
	err := i.RepoAIInsight.List(ctx, &aiInsights,
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		i.logger.WithErr(err).Warn("list ai insight failed")
		return
	}

	for _, aiInsight := range aiInsights {
		logger := i.logger.With("ai_insight", aiInsight)
		forum, err := i.SvcForum.GetByID(ctx, aiInsight.ForumID)
		if err != nil {
			if errors.Is(err, database.ErrRecordNotFound) {
				continue
			}

			logger.WithErr(err).Warn("get forum failed")
			continue
		}

		exist, err := i.exist(ctx, forum.InsightDatasetID, aiInsight)
		if err != nil || exist {
			continue
		}

		score, discAIInsights, err := i.calcScore(ctx, aiInsight)
		if err != nil {
			continue
		}

		if score == 0 {
			logger.Debug("score is zero, skip")
			continue
		}

		logger = logger.With("score", score)

		ragID, err := i.Rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
			DatasetID: forum.InsightDatasetID,
			Content:   aiInsight.Keyword,
		})
		if err != nil {
			logger.WithErr(err).Warn("insert rag record failed")
			continue
		}

		err = i.RepoRank.CreateAIInsight(ctx, &model.Rank{
			Base: model.Base{
				CreatedAt: aiInsight.CreatedAt,
				UpdatedAt: aiInsight.UpdatedAt,
			},
			Type:      model.RankTypeAIInsight,
			ScoreID:   aiInsight.Keyword,
			Score:     score,
			RagID:     ragID,
			ForeignID: aiInsight.ForumID,
			Hit:       1,
		}, discAIInsights)
		if err != nil {
			logger.WithErr(err).Warn("create ai_insight rank failed")
			continue
		}
	}

	// 删除1周前的 ai_insight 数据
	err = i.RepoAIInsight.Delete(ctx, repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPLT))
	if err != nil {
		i.logger.WithErr(err).Warn("remove expire ai insight failed")
	}
}

func (i *aiInsight2Rank) exist(ctx context.Context, datasetID string, data model.AIInsight) (bool, error) {
	logger := i.logger.WithContext(ctx).With("dataset_id", datasetID).With("msg", data)
	logger.Debug("check keyword exist")

	_, records, err := i.Rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetID:           datasetID,
		Query:               data.Keyword,
		TopK:                10,
		SimilarityThreshold: 0.5,
	})
	if err != nil {
		logger.WithErr(err).Warn("query rag records failed")
		return false, err
	}

	if len(records) == 0 {
		return false, nil
	}

	targets := make([]string, len(records))
	for i, record := range records {
		targets[i] = record.Content
	}

	res, err := i.LLM.Chat(ctx, llm.SimilarityPrompt, "", map[string]any{
		"Source":  data.Keyword,
		"Targets": targets,
	})
	if err != nil {
		logger.WithErr(err).Warn("chat to llm failed")
		return false, err
	}

	logger = logger.With("llm_res", res)

	index, err := strconv.Atoi(res)
	if err != nil {
		logger.Warn("can not atoi, invalid llm response")
		return false, nil
	}

	if index >= len(records) || index < 0 {
		logger.Debug("llm res out of range")
		return false, nil
	}

	exist, err := i.RepoRank.UpdateWithExist(ctx, map[string]any{
		"hit": gorm.Expr("hit+1"),
	}, repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("rag_id", records[index].DocID),
	)
	if err != nil {
		logger.WithErr(err).Warn("update hit failed")
		return false, err
	}

	if !exist {
		err = i.Rag.DeleteRecords(ctx, datasetID, []string{records[index].DocID})
		if err != nil {
			logger.WithErr(err).With("rag_id", records[index].DocID).Warn("delete not exist rag failed")
		}
	}

	return exist, nil
}

func (i *aiInsight2Rank) calcScore(ctx context.Context, data model.AIInsight) (float64, []model.DiscussionAIInsight, error) {
	logger := i.logger.WithContext(ctx).With("msg", data)
	logger.Debug("calc ai insight score")

	discs, err := i.SvcDisc.Search(ctx, svc.DiscussionSearchReq{
		ForumID:             data.ForumID,
		Keyword:             data.Keyword,
		SimilarityThreshold: 0.8,
	})
	if err != nil {
		logger.WithErr(err).Warn("search disc failed")
		return 0, nil, err
	}

	discUUIDs := make(model.StringArray, len(discs))
	discIDs := make(model.Int64Array, len(discs))
	discAIInsights := make([]model.DiscussionAIInsight, len(discs))
	for i, disc := range discs {
		discUUIDs[i] = disc.UUID
		discIDs[i] = int64(disc.ID)
		discAIInsights[i] = model.DiscussionAIInsight{
			DiscussionUUID: disc.UUID,
			Title:          disc.Title,
		}
	}

	if len(discIDs) == 0 {
		logger.Debug("disc not found, skip")
		return 0, nil, nil
	}

	var botUnknown int64
	err = i.RepoStat.Count(ctx, &botUnknown,
		repo.QueryWithEqual("type", model.StatTypeBotUnknown),
		repo.QueryWithEqual("key", discUUIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		logger.WithErr(err).Warn("count bot unknown faied")
		return 0, nil, err
	}

	var dislikeBot int64
	err = i.RepoComm.Count(ctx, &dislikeBot,
		repo.QueryWithEqual("discussion_id", discIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("parent_id", 0),
		repo.QueryWithEqual("bot", true),
	)
	if err != nil {
		logger.WithErr(err).Warn("count dislike bot disc failed")
		return 0, nil, err
	}

	if dislikeBot == 0 && botUnknown == 0 {
		return 0, nil, nil
	}

	floatDiscs := float64(len(discIDs))
	floatBotUnknown := float64(botUnknown)
	floatDislikeBot := float64(dislikeBot)

	score := math.Log2(1+floatDiscs) * (0.7*floatBotUnknown + 0.3*floatDislikeBot) / floatDiscs

	logger.With("score", score).Debug("calc score done")

	return score, discAIInsights, nil
}

func newAIInsight2Rank(in aiInsight2RankIn) Task {
	return &aiInsight2Rank{
		logger:           glog.Module("cron", "ai_insight_answer"),
		aiInsight2RankIn: in,
	}
}

func init() {
	register(newAIInsight2Rank)
}
