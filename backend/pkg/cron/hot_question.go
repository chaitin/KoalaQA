package cron

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
	"github.com/google/uuid"
)

type hotQuestion struct {
	logger *glog.Logger

	rank        *repo.Rank
	hotQuestion *repo.HotQuestion
	rag         rag.Service
	llm         *svc.LLM
	dataset     *repo.Dataset
	generator   *message.Generator
	svcWebhook  *svc.Webhook

	running int64
}

func (h *hotQuestion) Period() string {
	return "0 0 14 * * MON"
}

func (h *hotQuestion) Run() {
	if !atomic.CompareAndSwapInt64(&h.running, 0, 1) {
		return
	}
	defer atomic.CompareAndSwapInt64(&h.running, 1, 0)

	h.logger.Info("hot question task begin...")
	err := h.clearRag(context.Background())
	if err != nil {
		h.logger.WithErr(err).Warn("clear rag failed")
	}

	err = h.genGroup(context.Background())
	if err != nil {
		h.logger.WithErr(err).Error("generate group failed")
		return
	}

	err = h.questionToRank(context.Background())
	if err != nil {
		h.logger.WithErr(err).Error("question to rank failed")
		return
	}

	query := repo.QueryWithEqual("created_at", util.WeekTrunc(time.Now().AddDate(0, 0, -28)), repo.EqualOPLT)
	err = h.hotQuestion.Delete(context.Background(), query)
	if err != nil {
		h.logger.WithErr(err).Error("clear expire hot question failed")
	}

	err = h.rank.Delete(context.Background(), query, repo.QueryWithEqual("type", model.RankTypeHotQuestion))
	if err != nil {
		h.logger.WithErr(err).Error("clear expire hot question rank failed")
	}

	msg, err := h.generator.AIInsight(context.Background(), message.TypeAIInsightHotQuestion)
	if err != nil {
		h.logger.WithErr(err).Error("generate hot question msg failed")
		return
	}

	err = h.svcWebhook.Send(context.Background(), msg)
	if err != nil {
		h.logger.WithErr(err).Error("send hot question webhook failed")
		return
	}
}

type aiRes struct {
	Success  bool   `json:"success"`
	Question string `json:"question"`
}

func (h *hotQuestion) questionToRank(ctx context.Context) error {
	logger := h.logger.WithContext(ctx)
	logger.Info("save question to rank")

	now := time.Now()
	groups, err := h.hotQuestion.Groups(ctx, -1,
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
		repo.QueryWithEqual("group_id", "", repo.EqualOPNE))
	if err != nil {
		return err
	}

	var ranks []model.Rank
	for _, group := range groups {

		var questions []string
		for _, content := range group.Contents {
			questions = append(questions, content)
		}
		llmRes, err := h.llm.Chat(ctx, llm.SystemHotQuestionPrompt, strings.Join(questions, "\n------\n"), nil)
		if err != nil {
			logger.WithErr(err).With("group_id", group.GroupID).Warn("ai summary failed, skip")
			continue
		}
		var res aiRes
		err = json.Unmarshal([]byte(llmRes), &res)
		if err != nil {
			logger.WithErr(err).With("group_id", group.GroupID).With("ai_res", llmRes).Warn("unmarshal ai res failed")
			continue
		}

		if !res.Success {
			logger.With("group_id", group.GroupID).Info("ai can not summary hot question, skip")
			continue
		}

		ranks = append(ranks, model.Rank{
			Base: model.Base{
				CreatedAt: model.Timestamp(util.WeekTrunc(now.AddDate(0, 0, -7)).Unix()),
			},
			Type:    model.RankTypeHotQuestion,
			ScoreID: res.Question,
			Score:   float64(len(group.Contents)),
			Extra:   group.GroupID,
		})
		if len(ranks) == 5 {
			break
		}
	}

	err = h.rank.BatchCreate(ctx, &ranks)
	if err != nil {
		return err
	}

	return nil
}

type questionGroupItem struct {
	ragID    string
	groupID  string
	parentID uint
}

func (h *hotQuestion) genGroup(ctx context.Context) error {
	logger := h.logger.WithContext(ctx)
	logger.Info("genrate hot question group")

	now := time.Now()

	var questions []model.HotQuestion
	err := h.hotQuestion.List(ctx, &questions,
		repo.QueryWithEqual("created_at", util.WeekTrunc(now), repo.EqualOPLT),
		repo.QueryWithEqual("created_at", util.WeekTrunc(now.AddDate(0, 0, -7)), repo.EqualOPGTE),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return err
	}

	questionGroupM := make(map[uint]*questionGroupItem)
	questionRagM := make(map[string]uint)
	datasetID := h.dataset.GetRankID(ctx)

	for _, question := range questions {
		ragID, err := h.rag.UpsertRecords(ctx, rag.UpsertRecordsReq{
			DatasetID:  datasetID,
			DocumentID: uuid.NewString(),
			Content:    question.Content,
			Metadata: model.RankMetadata{
				Type: model.RankTypeHotQuestion,
			},
		})
		if err != nil {
			logger.WithErr(err).With("dataset_id", datasetID).With("question", question).Warn("create rag records failed")
			continue
		}

		questionGroupM[question.ID] = &questionGroupItem{
			ragID: ragID,
		}

		questionRagM[ragID] = question.ID
	}

	statusCtx, cancel := context.WithTimeout(ctx, time.Minute*30)
	defer cancel()

	for {
		finish, err := h.rag.DatasetProcessFinish(statusCtx, datasetID)
		if err != nil {
			logger.WithErr(err).Warn("get rag dataset process status failed")
			break
		}

		if !finish {
			logger.Info("wait rag process hot question data...")
			time.Sleep(time.Second * 4)
			continue
		}

		break
	}
	logger.Info("rag process hot question data finish")

	for _, question := range questions {
		q, ok := questionGroupM[question.ID]
		if !ok {
			continue
		}

	RAG_LOOP:
		for {
			_, chunks, err := h.rag.QueryRecords(ctx, rag.QueryRecordsReq{
				DatasetID: datasetID,
				Query:     question.Content,
				TopK:      10,
				Metadata: model.RankMetadata{
					Type: model.RankTypeHotQuestion,
				},
				SimilarityThreshold: 0.8,
				MaxChunksPerDoc:     1,
			})
			if err != nil {
				return err
			}

			if len(chunks) == 0 {
				q.parentID = question.ID
				break
			}

			sort.SliceStable(chunks, func(i, j int) bool {
				return chunks[i].Similarity > chunks[j].Similarity
			})

			for _, chunk := range chunks {
				gid, ok := questionRagM[chunk.DocID]
				if !ok {
					err = h.rag.DeleteRecords(ctx, datasetID, []string{chunk.DocID})
					if err != nil {
						logger.WithErr(err).With("dataset_id", datasetID).With("rag_id", chunk.DocID).Warn("clear not exist rag failed")
					}
					continue
				}
				if gid == question.ID {
					if len(chunks) == 1 {
						q.parentID = question.ID
						break RAG_LOOP
					}
					continue
				}

				q.parentID = gid
				break RAG_LOOP
			}
		}
	}

	visited := make(map[uint]bool)

	for id, item := range questionGroupM {
		if item.groupID != "" {
			continue
		}

		cur := []uint{id}
		parentID := item.parentID
		for !visited[parentID] {
			cur = append(cur, parentID)
			visited[parentID] = true
			parentID = questionGroupM[parentID].parentID
		}

		groupID := questionGroupM[parentID].groupID
		if groupID == "" {
			groupID = uuid.NewString()
		}

		for _, curID := range cur {
			questionGroupM[curID].groupID = groupID
		}
	}

	for id, groupItem := range questionGroupM {
		err = h.hotQuestion.Update(ctx, map[string]any{
			"rag_id":   groupItem.ragID,
			"group_id": groupItem.groupID,
		}, repo.QueryWithEqual("id", id))
		if err != nil {
			logger.WithErr(err).With("rag_id", groupItem.ragID).With("group_item", groupItem).Warn("update hot question failed")
			continue
		}
	}

	return nil
}

func (h *hotQuestion) clearRag(ctx context.Context) error {
	logger := h.logger.WithContext(ctx)
	logger.Info("begin clear rag hot question records")

	var questions []model.HotQuestion
	err := h.hotQuestion.List(ctx, &questions,
		repo.QueryWithSelectColumn("rag_id"),
		repo.QueryWithEqual("rag_id", "", repo.EqualOPNE),
	)
	if err != nil {
		return err
	}

	datasetID := h.dataset.GetRankID(ctx)

	ragIDs := make([]string, len(questions))
	for i, question := range questions {
		ragIDs[i] = question.RagID
	}

	if len(ragIDs) > 0 {
		err = h.rag.DeleteRecords(ctx, datasetID, ragIDs)
		if err != nil {
			logger.WithErr(err).With("dataset_id", datasetID).With("rag_ids", ragIDs).Warn("clear rag hot question failed")
		}
	}

	err = h.hotQuestion.Update(ctx, map[string]any{
		"rag_id": "",
	}, repo.QueryWithEqual("rag_id", "", repo.EqualOPNE))
	if err != nil {
		logger.WithErr(err).Warn("clear db hot question rag id failed")
	}

	return nil
}

func newHotQuestion(rank *repo.Rank, hq *repo.HotQuestion, rag rag.Service, gen *message.Generator,
	llm *svc.LLM, dataset *repo.Dataset, webhook *svc.Webhook) Task {
	return &hotQuestion{
		logger:      glog.Module("cron", "hot_question"),
		rank:        rank,
		hotQuestion: hq,
		rag:         rag,
		llm:         llm,
		dataset:     dataset,
		svcWebhook:  webhook,
		generator:   gen,
	}
}

func init() {
	register(newHotQuestion)
}
