package sub

import (
	"context"
	"fmt"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/mq"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/topic"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type QA struct {
	Question string
	Answer   string
}

type QAReview struct {
	repo    *repo.KBDocument
	comm    *repo.Comment
	kb      *repo.KnowledgeBase
	logger  *glog.Logger
	rag     rag.Service
	dataset *repo.Dataset
	llm     *svc.LLM
	disc    *svc.Discussion
}

func NewQA(repo *repo.KBDocument, comm *repo.Comment, kb *repo.KnowledgeBase, rag rag.Service, dataset *repo.Dataset, llm *svc.LLM, disc *svc.Discussion) *QAReview {
	return &QAReview{
		repo:    repo,
		comm:    comm,
		kb:      kb,
		rag:     rag,
		dataset: dataset,
		llm:     llm,
		disc:    disc,
		logger:  glog.Module("sub.qa_review"),
	}
}

func (q *QAReview) MsgType() mq.Message {
	return topic.MsgMessageNotify{}
}

func (q *QAReview) Topic() mq.Topic {
	return topic.TopicMessageNotify
}

func (q *QAReview) Group() string {
	return "koala_comment_accept_review"
}

func (q *QAReview) AckWait() time.Duration {
	return time.Minute * 2
}

func (q *QAReview) Concurrent() uint {
	return 10
}

func (q *QAReview) Handle(ctx context.Context, msg mq.Message) error {
	logger := q.logger.WithContext(ctx)
	logger.Info("handle qa review")
	data := msg.(topic.MsgMessageNotify)
	if data.Type != model.MsgNotifyTypeApplyComment {
		return nil
	}
	discussion, err := q.disc.GetByID(ctx, data.DiscussID)
	if err != nil {
		logger.WithErr(err).Warn("get discussion failed")
		return nil
	}
	aiQuestion, err := q.llm.Chat(ctx, llm.SystemQuestionSummaryPrompt, discussion.TitleContent(), nil)
	if err != nil {
		logger.WithErr(err).Warn("summary discussion question failed")
		return nil
	}
	_, answer, err := q.llm.GenerateChatPrompt(ctx, data.DiscussID, 0)
	if err != nil {
		logger.WithContext(ctx).WithErr(err).Error("generate prompt failed")
		return nil
	}
	aiAnswer, err := q.llm.Chat(ctx, llm.SystemAnswerSummaryPrompt, answer, nil)
	if err != nil {
		logger.WithErr(err).Warn("summary discussion answer failed")
		return nil
	}
	var comment model.Comment
	if err := q.comm.GetByID(ctx, &comment, data.CommentID); err != nil {
		logger.WithErr(err).Warn("get comment failed")
		return nil
	}
	kbID, err := q.kb.FirstID(ctx)
	if err != nil {
		logger.WithErr(err).Warn("get kb id failed")
		return nil
	}
	newQA := &model.KBDocument{
		KBID:     kbID,
		Title:    aiQuestion,
		Desc:     fmt.Sprintf("%d/%d", data.DiscussID, comment.ID),
		Markdown: []byte(aiAnswer),
		DocType:  model.DocTypeQuestion,
		Status:   model.DocStatusPendingReview,
	}
	chunks, err := q.rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetIDs:          []string{q.dataset.GetBackendID(ctx)},
		Query:               data.DiscussTitle,
		GroupIDs:            nil,
		TopK:                1000,
		SimilarityThreshold: 0.5,
	})
	if err != nil {
		logger.WithErr(err).Warn("query rag records failed")
		return nil
	}
	if len(chunks) == 0 {
		logger.With("question", newQA.Title).Info("create qa review for no rag records")
		return q.repo.Create(ctx, newQA)
	}
	docIds := make([]string, 0)
	for _, chunk := range chunks {
		docIds = append(docIds, chunk.DocID)
	}
	docs, err := q.repo.GetByRagIDs(ctx, docIds)
	if err != nil {
		logger.WithErr(err).Warn("get docs failed")
		return nil
	}
	var qas []QA
	for _, doc := range docs {
		if doc.DocType != model.DocTypeQuestion {
			continue
		}
		qas = append(qas, QA{
			Question: doc.Title,
			Answer:   string(doc.Markdown),
		})
		if newQA.SimilarID == 0 {
			logger.With("question", newQA.Title).With("similar_id", doc.ID).Info("set similar id")
			newQA.SimilarID = doc.ID
		}
	}
	like, err := q.llm.Chat(ctx, llm.QASimilarityPrompt, "", map[string]any{
		"NewQuestion": newQA.Title,
		"NewAnswer":   string(newQA.Markdown),
		"ExistingQAs": qas,
	})
	if err != nil {
		logger.WithErr(err).Warn("check qa similarity failed")
		return nil
	}
	if like == "true" {
		logger.With("question", newQA.Title).Debug("qa similarity found")
		return nil
	}
	logger.With("question", newQA.Title).Info("create qa review for no qa similarity")
	return q.repo.Create(ctx, newQA)
}
