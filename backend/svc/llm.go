package svc

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/pkg/rag"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/cloudwego/eino/components/prompt"
	"github.com/cloudwego/eino/schema"
)

type LLM struct {
	rag     rag.Service
	dataset *repo.Dataset
	logger  *glog.Logger
	doc     *repo.KBDocument
	disc    *repo.Discussion
	comm    *repo.Comment
	kit     *ModelKit
	cfg     config.Config
}

func newLLM(rag rag.Service, dataset *repo.Dataset, doc *repo.KBDocument, disc *repo.Discussion, comm *repo.Comment, kit *ModelKit, cfg config.Config) *LLM {
	return &LLM{
		rag:     rag,
		dataset: dataset,
		logger:  glog.Module("llm"),
		doc:     doc,
		disc:    disc,
		comm:    comm,
		kit:     kit,
		cfg:     cfg,
	}
}

func init() {
	registerSvc(newLLM)
}

type GenerateReq struct {
	Question      string `json:"question"`
	Prompt        string `json:"prompt"`
	DefaultAnswer string `json:"default_answer"`
}

func (l *LLM) Answer(ctx context.Context, req GenerateReq) (string, bool, error) {
	defaultAnswer := req.DefaultAnswer

	if defaultAnswer == "" {
		defaultAnswer = "无法回答问题"
	}

	knowledgeDocuments, err := l.queryKnowledgeDocuments(ctx, req.Question)
	if err != nil {
		return "", false, err
	}
	res, err := l.Chat(ctx, llm.SystemChatPrompt, req.Prompt, map[string]any{
		"DefaultAnswer":      defaultAnswer,
		"CurrentDate":        time.Now().Format("2006-01-02"),
		"KnowledgeDocuments": knowledgeDocuments,
		"AI_DEBUG":           l.cfg.RAG.DEBUG,
	})
	if err != nil {
		return "", false, err
	}
	if util.NormalizeString(res) == util.NormalizeString(defaultAnswer) {
		return req.DefaultAnswer, false, nil
	}
	return res, true, nil
}

func (l *LLM) Chat(ctx context.Context, sMsg string, uMsg string, params map[string]any) (string, error) {
	cm, err := l.kit.GetChatModel(ctx)
	if err != nil {
		return "", err
	}
	logger := l.logger.WithContext(ctx)
	templates := []schema.MessagesTemplate{
		schema.SystemMessage(sMsg),
	}
	if uMsg != "" {
		templates = append(templates, schema.UserMessage(uMsg))
	}
	template := prompt.FromMessages(schema.GoTemplate, templates...)
	msgs, err := template.Format(ctx, params)
	if err != nil {
		return "", err
	}
	for _, msg := range msgs {
		fmt.Println(msg.Role, msg.Content)
		// logger.With("role", msg.Role, "content", msg.Content).Debug("format message")
	}
	logger.Debug("wait llm response")
	res, err := cm.Generate(ctx, msgs)
	if err != nil {
		logger.WithErr(err).Error("llm response failed")
		return "", err
	}
	logger.With("response", res.Content).Debug("llm response success")
	return res.Content, nil
}

func (l *LLM) GenerateChatPrompt(ctx context.Context, discID uint, commID uint) (string, string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID, "comment_id", commID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取该讨论的所有评论
	var allComments []model.CommentDetail
	err = l.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return "", "", fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 获取新评论详情
	var newComment *model.CommentDetail
	if commID > 0 {
		newComment, err = l.comm.Detail(ctx, commID)
		if err != nil {
			return "", "", fmt.Errorf("get new comment detail failed: %w", err)
		}
	}

	// 4. 创建提示词模版并生成提示词
	template := llm.NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		return "", "", fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), prompt, nil
}

func (l *LLM) GeneratePostPrompt(ctx context.Context, discID uint) (string, string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	template := llm.NewDiscussionPromptTemplate(discussion, nil, nil)

	prompt, err := template.BuildPostPrompt()
	if err != nil {
		return "", "", fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), prompt, nil
}

// queryKnowledgeDocuments 查询相关知识文档
func (l *LLM) queryKnowledgeDocuments(ctx context.Context, query string) ([]llm.KnowledgeDocument, error) {
	logger := l.logger.WithContext(ctx)

	logger.With("query", query).Debug("query knowledge documents")

	// 使用RAG服务查询相关文档
	records, err := l.rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetIDs: []string{l.dataset.GetBackendID(ctx)},
		Query:      query,
	})
	if err != nil {
		return nil, fmt.Errorf("RAG query failed: %w", err)
	}
	docContent := make(map[string]string)
	for _, ragRecord := range records {
		docContent[ragRecord.DocID] += "\n" + ragRecord.Content
	}
	var ragIDs []string
	for _, record := range records {
		ragIDs = append(ragIDs, record.DocID)
	}
	logger.With("rag_ids", ragIDs).Debug("RAG query success")
	docs, err := l.doc.GetByRagIDs(ctx, ragIDs)
	if err != nil {
		return nil, fmt.Errorf("get document detail failed: %w", err)
	}
	knowledgeDocs := make([]llm.KnowledgeDocument, 0, len(docs))
	for _, doc := range docs {
		knowledgeDocs = append(knowledgeDocs, llm.KnowledgeDocument{
			Title:   doc.Title,
			Content: docContent[doc.RagID],
			Source:  strconv.Itoa(int(doc.ID)),
		})
	}
	logger.With("knowledges", knowledgeDocs).Debug("query knowledge documents success")
	return knowledgeDocs, nil
}

type PolishReq struct {
	Text string `json:"text"`
}

func (l *LLM) Polish(ctx context.Context, req PolishReq) (string, error) {
	res, err := l.Chat(ctx, llm.PolishTextPrompt, req.Text, nil)
	if err != nil {
		return "", err
	}
	return res, nil
}

type UpdatePromptReq struct {
	Prompt string `json:"prompt"`
}

func (l *LLM) UpdateSystemChatPrompt(ctx context.Context, req UpdatePromptReq) error {
	llm.SystemChatPrompt = req.Prompt
	return nil
}

func (l *LLM) GetSystemChatPrompt(ctx context.Context) (string, error) {
	return llm.SystemChatPrompt, nil
}
