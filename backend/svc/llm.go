package svc

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
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
	kit     *ModelKit
	cfg     config.Config
	disc    *repo.Discussion
	comm    *repo.Comment
	repoLLM *repo.LLM
}

func newLLM(rag rag.Service, dataset *repo.Dataset, doc *repo.KBDocument, kit *ModelKit, cfg config.Config, disc *repo.Discussion, comm *repo.Comment, repoLLM *repo.LLM) *LLM {
	return &LLM{
		rag:     rag,
		dataset: dataset,
		logger:  glog.Module("llm"),
		doc:     doc,
		kit:     kit,
		cfg:     cfg,
		disc:    disc,
		comm:    comm,
		repoLLM: repoLLM,
	}
}

func init() {
	registerSvc(newLLM)
}

type GenerateContextItem struct {
	Bot     bool   `json:"bot"`
	Content string `json:"content"`
}

type GenerateReq struct {
	Context       []GenerateContextItem `json:"context"`
	Question      string                `json:"question"`
	Groups        []model.GroupItemInfo `json:"groups"`
	Prompt        string                `json:"prompt"`
	DefaultAnswer string                `json:"default_answer"`
	NewCommentID  uint                  `json:"new_comment_id"`
	Debug         bool                  `json:"debug"`
}

func (g *GenerateReq) Histories() []*schema.Message {
	res := make([]*schema.Message, len(g.Context))
	for i := range g.Context {
		role := schema.User
		if g.Context[i].Bot {
			role = schema.Assistant
		}
		res[i] = &schema.Message{
			Role:    role,
			Content: g.Context[i].Content,
		}
	}

	return res
}

func (g *GenerateReq) GroupInfo() (ids model.Int64Array, names []string) {
	for _, item := range g.Groups {
		ids = append(ids, int64(item.ID))
		names = append(names, item.Name)
	}

	return
}

func (l *LLM) StreamAnswer(ctx context.Context, sysPrompt string, req GenerateReq) (*llm.Stream[string], error) {
	query := req.Question

	groupIDs, groupNames := req.GroupInfo()

	if len(groupNames) > 0 {
		query += "\n" + strings.Join(groupNames, ",")
	}

	chatHistoies := make([]string, 0)
	for _, v := range req.Context {
		if v.Bot {
			continue
		}

		chatHistoies = append(chatHistoies, v.Content)
	}

	rewrittenQuery, knowledgeDocuments, err := l.queryKnowledgeDocuments(ctx, query, model.KBDocMetadata{
		GroupIDs: groupIDs,
	}, chatHistoies...)
	if err != nil {
		return nil, err
	}

	return l.StreamChat(ctx, sysPrompt, req.Prompt, map[string]any{
		"Question":           rewrittenQuery,
		"NewCommentID":       req.NewCommentID,
		"CurrentDate":        time.Now().Format("2006-01-02"),
		"DefaultAnswer":      req.DefaultAnswer,
		"KnowledgeDocuments": knowledgeDocuments,
		"Debug":              req.Debug,
	}, req.Histories()...)
}

func (l *LLM) answer(ctx context.Context, sysPrompt string, req GenerateReq) (string, bool, error) {
	query := req.Question

	groupIDs, groupNames := req.GroupInfo()

	if len(groupNames) > 0 {
		query += "\n" + strings.Join(groupNames, ",")
	}

	rewrittenQuery, knowledgeDocuments, err := l.queryKnowledgeDocuments(ctx, query, model.KBDocMetadata{
		GroupIDs: groupIDs,
	})
	if err != nil {
		return "", false, err
	}
	res, err := l.Chat(ctx, sysPrompt, req.Prompt, map[string]any{
		"Question":           rewrittenQuery,
		"NewCommentID":       req.NewCommentID,
		"CurrentDate":        time.Now().Format("2006-01-02"),
		"KnowledgeDocuments": knowledgeDocuments,
	})
	if err != nil {
		return "", false, err
	}

	// 解析 JSON 响应
	resp, err := llm.ParseChatResponse(res)
	if err != nil {
		l.logger.WithContext(ctx).WithErr(err).With("raw", res).Error("llm response parse failed")
		return "", false, err
	}
	l.logger.WithContext(ctx).
		With("matched", resp.Matched).
		With("reason", resp.Reason).
		Info("llm response parsed")
	if !resp.Matched || resp.Answer == "" {
		return req.DefaultAnswer, false, nil
	}
	if len(resp.Sources) > 0 {
		resp.Answer += "\n\n---\n\n" + "引用来源: "
		for i, source := range resp.Sources {
			resp.Answer += fmt.Sprintf(`<span data-tooltip="<h3>来源</h3><br>%s">[%d]</span> `, source.Title, i+1)
		}
	}
	return resp.Answer, true, nil
}

func (l *LLM) Answer(ctx context.Context, req GenerateReq) (string, bool, error) {
	return l.answer(ctx, llm.SystemChatPrompt, req)
}

func (l *LLM) AnswerWithThink(ctx context.Context, req GenerateReq) (string, bool, error) {
	return l.answer(ctx, llm.SystemChatWithThinkPrompt, req)
}

var tokenLimitKeywords = []string{
	"reduce the length",
	"must have less than",
	"token limit",
	"tokens exceeded",
	"context length",
	"maximum context",
	"too many tokens",
	"input is too long",
	"exceeds the maximum",
	"max_tokens is invalid",
	"prompt_tokens is invalid",
}

func (l *LLM) IsTokenLimitError(err error) bool {
	if err == nil {
		return false
	}

	return util.StringContainsAny(err.Error(), tokenLimitKeywords)
}

// updateChatModelStatus 更新智能对话模型的状态
func (l *LLM) updateChatModelStatus(ctx context.Context, status model.LLMStatus, message string) {
	logger := l.logger.WithContext(ctx)

	// 获取智能对话模型
	chatModel, err := l.repoLLM.GetChatModel(ctx)
	if err != nil {
		logger.WithErr(err).Warn("get chat model failed when updating status")
		return
	}

	// 更新状态
	err = l.repoLLM.Update(ctx, map[string]any{
		"status":     status,
		"message":    message,
		"updated_at": time.Now(),
	}, repo.QueryWithEqual("id", chatModel.ID))

	if err != nil {
		logger.WithErr(err).Warn("update chat model status failed")
	} else {
		logger.With("status", status, "model_id", chatModel.ID).Info("chat model status updated")
	}
}

func (l *LLM) Chat(ctx context.Context, sMsg string, uMsg string, params map[string]any) (string, error) {
	cm, err := l.kit.GetChatModel(ctx)
	if err != nil {
		return "", err
	}
	logger := l.logger.WithContext(ctx)

	msgs, err := l.msgs(ctx, sMsg, uMsg, params)
	if err != nil {
		return "", err
	}

	logger.Debug("wait llm response")
	res, err := cm.Generate(ctx, msgs)
	if err != nil {
		logger.WithErr(err).Error("llm response failed")
		// 更新模型状态为错误
		l.updateChatModelStatus(ctx, model.LLMStatusError, err.Error())
		return "", err
	}

	// 调用成功，更新模型状态为正常
	l.updateChatModelStatus(ctx, model.LLMStatusNormal, "")

	logger.With("response", res.Content).Debug("llm response success")
	return res.Content, nil
}

func (l *LLM) msgs(ctx context.Context, sMsg string, uMsg string, params map[string]any) ([]*schema.Message, error) {
	if params == nil {
		params = make(map[string]any)
	}
	templates := []schema.MessagesTemplate{
		schema.SystemMessage(sMsg),
	}
	if uMsg != "" {
		params["Context"] = uMsg
		templates = append(templates, schema.UserMessage(llm.UserMsgFormat))
	}
	template := prompt.FromMessages(schema.GoTemplate, templates...)
	msgs, err := template.Format(ctx, params)
	if err != nil {
		return nil, err
	}
	for _, msg := range msgs {
		fmt.Println(msg.Role, msg.Content)
		// logger.With("role", msg.Role, "content", msg.Content).Debug("format message")
	}

	return msgs, nil
}

func (l *LLM) StreamChat(ctx context.Context, sMsg string, uMsg string, params map[string]any, histories ...*schema.Message) (*llm.Stream[string], error) {
	cm, err := l.kit.GetChatModel(ctx)
	if err != nil {
		return nil, err
	}
	logger := l.logger.WithContext(ctx)

	msgs, err := l.msgs(ctx, sMsg, uMsg, params)
	if err != nil {
		return nil, err
	}

	logger.Debug("wait llm stream response")
	reader, err := cm.Stream(ctx, slices.Insert(msgs, 1, histories...))
	if err != nil {
		// 更新模型状态为错误
		l.updateChatModelStatus(ctx, model.LLMStatusError, err.Error())
		return nil, err
	}

	s := llm.NewStream[string]()

	// 标记是否有错误发生
	hasError := false
	var streamErr error

	go func() {
		defer reader.Close()

		s.Recv(func() (string, error) {
			msg, err := reader.Recv()
			if err != nil {
				// 记录流式错误
				hasError = true
				streamErr = err
				return "", err
			}

			return msg.Content, nil
		})

		// 流结束后更新状态
		if hasError && streamErr != nil {
			l.updateChatModelStatus(ctx, model.LLMStatusError, streamErr.Error())
		} else {
			// 流式调用成功
			l.updateChatModelStatus(ctx, model.LLMStatusNormal, "")
		}
	}()

	return s, nil
}

// GenerateAnswerPrompt 生成回复帖子的提示词
func (l *LLM) GenerateAnswerPrompt(ctx context.Context, discID uint, commID uint) (string, []model.GroupItemInfo, string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID, "comment_id", commID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", nil, "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取该讨论的所有评论
	var allComments []model.CommentDetail
	err = l.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return "", nil, "", fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 获取新评论详情
	var newComment *model.CommentDetail
	if commID > 0 {
		newComment, err = l.comm.Detail(ctx, commID)
		if err != nil {
			return "", nil, "", fmt.Errorf("get new comment detail failed: %w", err)
		}
	}

	// 4. 创建提示词模版并生成提示词
	template := llm.NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildFullPrompt()
	if err != nil {
		return "", nil, "", fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), discussion.GroupInfo(), prompt, nil
}

// GenerateContentForRetrieval 生成用于检索的纯内容文本
func (l *LLM) GenerateContentForRetrieval(ctx context.Context, discID uint) (string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate content for retrieval")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取所有评论
	var allComments []model.CommentDetail
	err = l.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return "", fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 创建模版并生成纯内容
	template := llm.NewDiscussionPromptTemplate(discussion, allComments, nil)
	content := template.BuildContentForRetrieval()

	logger.Debug("generate content for retrieval success")
	return content, nil
}

// GenerateContentForRetrieval 生成用于检索的纯内容文本
func (l *LLM) GenerateContentForRetrievalWithoutComments(ctx context.Context, discID uint) (string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate content for retrieval")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", fmt.Errorf("get discussion detail failed: %w", err)
	}
	// 2. 创建模版并生成纯内容
	template := llm.NewDiscussionPromptTemplate(discussion, nil, nil)
	content := template.BuildContentForRetrieval()

	logger.Debug("generate content for retrieval success")
	return content, nil
}

func (l *LLM) GenerateDiscussionPrompt(ctx context.Context, discIDs ...uint) (string, error) {
	var discTemplates llm.DiscussionPromptTemplates
	for _, discID := range discIDs {
		template, err := l.discussionPromptTemplate(ctx, discID, 0)
		if err != nil {
			l.logger.WithContext(ctx).WithErr(err).With("disc_id", discID).Warn("get discussion propmt failed")
			continue
		}
		discTemplates = append(discTemplates, *template)
	}

	if len(discTemplates) == 0 {
		l.logger.WithContext(ctx).With("disc_ids", discIDs).Warn("discs not found")
		return "", nil
	}

	return discTemplates.BuildFullPrompt()
}

func (l *LLM) discussionPromptTemplate(ctx context.Context, discID uint, commID uint) (*llm.DiscussionPromptTemplate, error) {
	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return nil, fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 获取该讨论的所有评论
	var allComments []model.CommentDetail
	err = l.comm.List(ctx, &allComments,
		repo.QueryWithEqual("discussion_id", discID),
		repo.QueryWithOrderBy("created_at ASC"),
	)
	if err != nil {
		return nil, fmt.Errorf("get discussion comments failed: %w", err)
	}

	// 3. 获取新评论详情
	var newComment *model.CommentDetail
	if commID > 0 {
		newComment, err = l.comm.Detail(ctx, commID)
		if err != nil {
			return nil, fmt.Errorf("get new comment detail failed: %w", err)
		}
	}

	return llm.NewDiscussionPromptTemplate(discussion, allComments, newComment), nil
}

func (l *LLM) GeneratePostPrompt(ctx context.Context, discID uint) (string, string, []model.GroupItemInfo, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", "", nil, fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 如果为问答，获取该讨论的所有评论
	var allComments []model.CommentDetail
	if discussion.Type == model.DiscussionTypeQA {
		err = l.comm.List(ctx, &allComments,
			repo.QueryWithEqual("discussion_id", discID),
			repo.QueryWithOrderBy("created_at ASC"),
		)
		if err != nil {
			return "", "", nil, fmt.Errorf("get discussion comments failed: %w", err)
		}
	}

	template := llm.NewDiscussionPromptTemplate(discussion, allComments, nil)

	prompt, err := template.BuildPostPrompt()
	if err != nil {
		return "", "", nil, fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), prompt, discussion.GroupInfo(), nil
}

// queryKnowledgeDocuments 查询相关知识文档
func (l *LLM) queryKnowledgeDocuments(ctx context.Context, query string, metadata rag.Metadata, histories ...string) (string, []llm.KnowledgeDocument, error) {
	logger := l.logger.WithContext(ctx)

	logger.With("query", query).Debug("query knowledge documents")

	// 使用RAG服务查询相关文档
	rewrittenQuery, records, err := l.rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetID: l.dataset.GetBackendID(ctx),
		Query:     query,
		Metadata:  metadata,
		Histories: histories,
	})
	if err != nil {
		return "", nil, fmt.Errorf("RAG query failed: %w", err)
	}
	docContent := make(map[string]string)
	for _, ragRecord := range records {
		docContent[ragRecord.DocID] += "\n" + ragRecord.Content
	}
	var (
		ragIDs []string
		ragIDM = make(map[string]struct{})
	)
	for _, record := range records {
		ragIDs = append(ragIDs, record.DocID)
		ragIDM[record.DocID] = struct{}{}
	}
	logger.With("rag_ids", ragIDs).Debug("RAG query success")
	docs, err := l.doc.GetByRagIDs(ctx, ragIDs)
	if err != nil {
		return "", nil, fmt.Errorf("get document detail failed: %w", err)
	}

	for _, doc := range docs {
		delete(ragIDM, doc.RagID)
	}

	if len(ragIDM) > 0 {
		deleteRagIDs := make([]string, 0, len(ragIDM))
		for ragID := range ragIDM {
			deleteRagIDs = append(deleteRagIDs, ragID)
		}

		err = l.rag.DeleteRecords(ctx, l.dataset.GetBackendID(ctx), deleteRagIDs)
		if err != nil {
			logger.WithErr(err).With("rag_ids", deleteRagIDs).Warn("delete not exist rag failed")
		}
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
	return rewrittenQuery, knowledgeDocs, nil
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
