package cron

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type invalidKnowledge struct {
	logger *glog.Logger

	stat       *repo.Stat
	rank       *repo.Rank
	generator  *message.Generator
	svcWebhook *svc.Webhook
	doc        *repo.KBDocument

	running int64
}

func (i *invalidKnowledge) Period() string {
	return "0 0 10 1 *"
}

func (i *invalidKnowledge) coefficient(t, now time.Time) float64 {
	if t.AddDate(0, 0, 30).After(now) {
		return 0
	}
	if t.AddDate(0, 0, 90).After(now) {
		return 1
	}
	if t.AddDate(0, 0, 180).After(now) {
		return 1.5
	}

	return 2
}

func (i *invalidKnowledge) Run() {
	if !atomic.CompareAndSwapInt64(&i.running, 0, 1) {
		return
	}
	defer atomic.CompareAndSwapInt64(&i.running, 1, 0)

	now := time.Now()
	ctx := context.Background()
	logger := i.logger.WithContext(ctx)

	lastMonth := util.DayTrunc(now.AddDate(0, -1, 0))

	logger.Info("query invalid knowledge task beging...")

	err := i.rank.Delete(ctx, repo.QueryWithEqual("created_at", util.DayTrunc(now.AddDate(0, -4, 0)), repo.EqualOPLT),
		repo.QueryWithEqual("type", model.RankTypeInvalidKnowledge))
	if err != nil {
		logger.WithErr(err).Warn("clear expire rank failed")
	}

	err = i.stat.Delete(ctx, repo.QueryWithEqual("created_at", util.DayTrunc(now.AddDate(0, -4, 0)), repo.EqualOPLT),
		repo.QueryWithEqual("type", model.StatTypeKnowledgeHit))
	if err != nil {
		logger.WithErr(err).Warn("clear expire knowledge hit stat failed")
	}

	knowledges, err := i.stat.InvalidKnowledge(ctx,
		repo.QueryWithEqual("stats.created_at", util.DayTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("stats.created_at", lastMonth, repo.EqualOPGTE),
		repo.QueryWithEqual("kb_documents.updated_at", now.AddDate(0, 0, -30), repo.EqualOPLT),
	)
	if err != nil {
		logger.WithErr(err).Error("query invalid knowledge failed")
		return
	}

	ranks := make([]model.Rank, 0)
	knowledgeDocIDs := make(model.Int64Array, 0)

	if len(knowledges) > 0 {
		for _, knowledge := range knowledges {
			if knowledge.HitCount == 0 {
				continue
			}

			docID, err := strconv.Atoi(knowledge.Key)
			if err != nil {
				logger.WithErr(err).With("key", knowledge.Key).Warn("invalid knowledge key, skip")
				continue
			}
			knowledgeDocIDs = append(knowledgeDocIDs, int64(docID))

			if knowledge.DislikeCount == 0 {
				continue
			}

			t := i.coefficient(knowledge.UpdatedAt.Time(), now)
			if t == 0 {
				continue
			}

			docBytes, err := json.Marshal(model.StatInvalidKnowledgeDoc{
				Title:        knowledge.Title,
				Type:         knowledge.Type,
				DislikeCount: knowledge.DislikeCount,
				HitCount:     knowledge.HitCount,
				UpdatedAt:    knowledge.UpdatedAt,
			})
			if err != nil {
				logger.WithErr(err).With("knowledge_info", knowledge).Warn("marsha json failed, skip")
				continue
			}

			ranks = append(ranks, model.Rank{
				Base: model.Base{
					CreatedAt: model.Timestamp(lastMonth.Unix()),
				},
				Type:    model.RankTypeInvalidKnowledge,
				ScoreID: knowledge.Key,
				Score:   (float64(knowledge.DislikeCount) + 1) / (float64(knowledge.HitCount) + 1) * t,
				Extra:   string(docBytes),
			})
		}

		sort.SliceStable(ranks, func(i, j int) bool {
			return ranks[i].Score > ranks[j].Score
		})

		if len(ranks) > 5 {
			ranks = ranks[:5:5]
		}
	}

	docQuery := []repo.QueryOptFunc{
		repo.QueryWithSelectColumn("id, updated_at, title, doc_type"),
		repo.QueryWithEqual("updated_at", util.DayTrunc(now.AddDate(0, 0, -30)), repo.EqualOPLT),
		repo.QueryWithEqual("file_type", model.FileTypeFolder, repo.EqualOPNE),
		repo.QueryWithOrderBy("updated_at ASC, id ASC"),
		repo.QueryWithPagination(&model.Pagination{
			Page: 1,
			Size: 5,
		}),
	}
	if len(knowledgeDocIDs) > 0 {
		docQuery = append(docQuery, repo.QueryWithEqual("id", knowledgeDocIDs, repo.EqualOPNotEqAny))
	}

	var docs []model.KBDocument
	err = i.doc.List(ctx, &docs, docQuery...)
	if err != nil {
		logger.WithErr(err).Error("query zero doc failed")
		return
	}

	for _, doc := range docs {
		t := i.coefficient(doc.UpdatedAt.Time(), now)
		if t == 0 {
			continue
		}

		docBytes, err := json.Marshal(model.StatInvalidKnowledgeDoc{
			Title:     doc.Title,
			Type:      doc.DocType,
			UpdatedAt: doc.UpdatedAt,
		})
		if err != nil {
			logger.WithErr(err).With("knowledge_info", doc).Warn("marsha json failed, skip")
			continue
		}

		ranks = append(ranks, model.Rank{
			Base: model.Base{
				CreatedAt: model.Timestamp(lastMonth.Unix()),
			},
			Type:    model.RankTypeInvalidKnowledge,
			ScoreID: strconv.FormatUint(uint64(doc.ID), 10),
			Score:   t,
			Extra:   string(docBytes),
		})
	}
	if len(ranks) == 0 {
		logger.Info("empty ranks. return")
		return
	}

	err = i.rank.BatchCreate(ctx, &ranks)
	if err != nil {
		logger.WithErr(err).Error("create rank failed")
		return
	}

	msg, err := i.generator.AIInsight(ctx, message.TypeAIInsightInvalidKnowledge)
	if err != nil {
		logger.WithErr(err).Error("generate msg failed")
		return
	}

	err = i.svcWebhook.Send(ctx, msg)
	if err != nil {
		logger.WithErr(err).Error("send wenhook failed")
		return
	}
}

func newInvalidKnowledge(stat *repo.Stat, doc *repo.KBDocument,
	rank *repo.Rank, gen *message.Generator, webhook *svc.Webhook) Task {
	return &invalidKnowledge{
		logger:     glog.Module("cron", "invalid_knowledge"),
		stat:       stat,
		rank:       rank,
		generator:  gen,
		svcWebhook: webhook,
		doc:        doc,
	}
}

func init() {
	register(newInvalidKnowledge)
}
