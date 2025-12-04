package sub

import (
	"context"
	"math"
	"slices"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type aiInsightIn struct {
	fx.In

	LLM      *svc.LLM
	SvcDisc  *svc.Discussion
	SvcForum *svc.Forum
	RepoRank *repo.Rank
	RepoStat *repo.Stat
	RepoComm *repo.Comment
	Rag      rag.Service
}

type AIInsight struct {
	in aiInsightIn

	logger *glog.Logger
}

func newAIInsight(in aiInsightIn) *AIInsight {
	return &AIInsight{in: in, logger: glog.Module("sub", "ai_insight")}
}

func (i *AIInsight) MsgType() mq.Message {
	return topic.MsgAIInsight{}
}

func (i *AIInsight) Topic() mq.Topic {
	return topic.TopicAIInsight
}

func (i *AIInsight) Group() string {
	return "koala_ai_insight"
}

func (i *AIInsight) AckWait() time.Duration {
	return time.Minute * 5
}

func (i *AIInsight) Concurrent() uint {
	return 1
}

func (i *AIInsight) Handle(ctx context.Context, msg mq.Message) error {
	data := msg.(topic.MsgAIInsight)
	logger := i.logger.WithContext(ctx).With("msg", data)
	logger.Debug("receive ai insight msg")

	forum, err := i.in.SvcForum.GetByID(ctx, data.ForumID)
	if err != nil {
		logger.WithErr(err).Warn("get forum failed")
		return nil
	}

	exist, err := i.exist(ctx, forum.InsightDatasetID, data)
	if err != nil || exist {
		return nil
	}

	score, err := i.calcScore(ctx, data)
	if err != nil {
		return nil
	}

	logger = logger.With("score", score)

	if score == 0 {
		logger.Debug("score is zero, skip")
		return nil
	}
	ragID, err := i.in.Rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
		DatasetID: forum.InsightDatasetID,
		Content:   data.Keyword,
	})
	if err != nil {
		logger.WithErr(err).Warn("insert rag record failed")
		return nil
	}

	err = i.in.RepoRank.Create(ctx, &model.Rank{
		Type:      model.RankTypeAIInsight,
		ScoreID:   data.Keyword,
		Score:     score,
		RagID:     ragID,
		ForeignID: data.ForumID,
		Hit:       1,
	})
	if err != nil {
		logger.WithErr(err).Warn("create rank failed")
		return nil
	}
	return nil
}

func (i *AIInsight) exist(ctx context.Context, datasetID string, data topic.MsgAIInsight) (bool, error) {
	logger := i.logger.WithContext(ctx).With("dataset_id", datasetID).With("msg", data)
	logger.Debug("check keyword exist")

	_, records, err := i.in.Rag.QueryRecords(ctx, rag.QueryRecordsReq{
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

	res, err := i.in.LLM.Chat(ctx, llm.SimilarityPrompt, "", map[string]any{
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

	exist, err := i.in.RepoRank.UpdateWithExist(ctx, map[string]any{
		"hit": gorm.Expr("hit+1"),
	}, repo.QueryWithEqual("type", model.RankTypeAIInsight),
		repo.QueryWithEqual("rag_id", records[index].DocID),
	)
	if err != nil {
		logger.WithErr(err).Warn("update hit failed")
		return false, err
	}

	return exist, nil
}

func (i *AIInsight) calcScore(ctx context.Context, data topic.MsgAIInsight) (float64, error) {
	logger := i.logger.WithContext(ctx).With("msg", data)
	logger.Debug("calc ai insight score")

	discs, err := i.in.SvcDisc.Search(ctx, svc.DiscussionSearchReq{
		ForumID:             data.ForumID,
		Keyword:             data.Keyword,
		SimilarityThreshold: 0.8,
	})
	if err != nil {
		logger.WithErr(err).Warn("search disc failed")
		return 0, err
	}

	discUUIDs := make(model.StringArray, len(discs))
	discIDs := make(model.Int64Array, len(discs))
	for i, disc := range discs {
		if slices.Contains(data.Exclude, int64(disc.ID)) {
			continue
		}

		discUUIDs[i] = disc.UUID
		discIDs[i] = int64(disc.ID)
	}

	if len(discIDs) == 0 {
		logger.Debug("disc not found, skip")
		return 0, nil
	}

	var botUnknown int64
	err = i.in.RepoStat.Count(ctx, &botUnknown,
		repo.QueryWithEqual("type", model.StatTypeBotUnknown),
		repo.QueryWithEqual("key", discUUIDs, repo.EqualOPEqAny),
	)
	if err != nil {
		logger.WithErr(err).Warn("count bot unknown faied")
		return 0, err
	}

	var dislikeBot int64
	err = i.in.RepoComm.Count(ctx, &dislikeBot,
		repo.QueryWithEqual("discussion_id", discIDs, repo.EqualOPEqAny),
		repo.QueryWithEqual("parent_id", 0),
		repo.QueryWithEqual("bot", true),
	)
	if err != nil {
		logger.WithErr(err).Warn("count dislike bot disc failed")
		return 0, err
	}

	if dislikeBot == 0 && botUnknown == 0 {
		return 0, nil
	}

	floatDiscs := float64(len(discIDs))
	floatBotUnknown := float64(botUnknown)
	floatDislikeBot := float64(dislikeBot)

	score := math.Log2(1+floatDiscs) * (0.7*floatBotUnknown + 0.3*floatDislikeBot) / floatDiscs

	logger.With("score", score).Debug("calc score done")
	return score, nil
}
