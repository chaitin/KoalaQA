package svc

import (
	"context"
	"fmt"
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
}

func newLLM(rag rag.Service, dataset *repo.Dataset, doc *repo.KBDocument, kit *ModelKit, cfg config.Config, disc *repo.Discussion, comm *repo.Comment) *LLM {
	return &LLM{
		rag:     rag,
		dataset: dataset,
		logger:  glog.Module("llm"),
		doc:     doc,
		kit:     kit,
		cfg:     cfg,
		disc:    disc,
		comm:    comm,
	}
}

func init() {
	registerSvc(newLLM)
}

type GenerateReq struct {
	Question      string                `json:"question"`
	Groups        []model.GroupItemInfo `json:"groups"`
	Prompt        string                `json:"prompt"`
	DefaultAnswer string                `json:"default_answer"`
	NewCommentID  uint                  `json:"new_comment_id"`
}

func (g *GenerateReq) GroupInfo() (ids model.Int64Array, names []string) {
	for _, item := range g.Groups {
		ids = append(ids, int64(item.ID))
		names = append(names, item.Name)
	}

	return
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
		return "", err
	}
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

type LLMStream struct {
	c    chan string
	stop chan struct{}
}

func (l *LLMStream) Close() {
	close(l.stop)
}

func (l *LLMStream) Recv(f func() (string, error)) {
	defer close(l.c)
	for {
		content, err := f()
		if err != nil {
			return
		}

		select {
		case <-l.stop:
			return
		case l.c <- content:
		}
	}
}

func (l *LLMStream) Send(ctx context.Context, f func(content string)) {
	defer l.Close()

	for {
		content, ok := l.Text(ctx)
		if !ok {
			return
		}

		f(content)
	}
}

func (l *LLMStream) Text(ctx context.Context) (string, bool) {
	select {
	case <-ctx.Done():
		return "", false
	case content, ok := <-l.c:
		if !ok {
			return "", false
		}

		return content, true
	}
}

func (l *LLM) StreamChat(ctx context.Context, sMsg string, uMsg string, params map[string]any) (*LLMStream, error) {
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
	reader, err := cm.Stream(ctx, msgs)
	if err != nil {
		return nil, err
	}

	s := LLMStream{
		c:    make(chan string, 8),
		stop: make(chan struct{}),
	}

	go s.Recv(func() (string, error) {
		msg, err := reader.Recv()
		if err != nil {
			return "", err
		}

		return msg.Content, nil
	})

	return &s, nil
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

func (l *LLM) GeneratePostPrompt(ctx context.Context, discID uint) (string, string, error) {
	logger := l.logger.WithContext(ctx).With("discussion_id", discID)
	logger.Debug("start generate prompt")

	// 1. 获取讨论详情
	discussion, err := l.disc.Detail(ctx, 0, discID)
	if err != nil {
		return "", "", fmt.Errorf("get discussion detail failed: %w", err)
	}

	// 2. 如果为问答，获取该讨论的所有评论
	var allComments []model.CommentDetail
	if discussion.Type == model.DiscussionTypeQA {
		err = l.comm.List(ctx, &allComments,
			repo.QueryWithEqual("discussion_id", discID),
			repo.QueryWithOrderBy("created_at ASC"),
		)
		if err != nil {
			return "", "", fmt.Errorf("get discussion comments failed: %w", err)
		}
	}

	template := llm.NewDiscussionPromptTemplate(discussion, allComments, nil)

	prompt, err := template.BuildPostPrompt()
	if err != nil {
		return "", "", fmt.Errorf("generate prompt failed: %w", err)
	}

	logger.With("prompt", prompt).Debug("generate prompt success")
	return template.Question(), prompt, nil
}

// queryKnowledgeDocuments 查询相关知识文档
func (l *LLM) queryKnowledgeDocuments(ctx context.Context, query string, metadata rag.Metadata) (string, []llm.KnowledgeDocument, error) {
	logger := l.logger.WithContext(ctx)

	logger.With("query", query).Debug("query knowledge documents")

	// 使用RAG服务查询相关文档
	rewrittenQuery, records, err := l.rag.QueryRecords(ctx, rag.QueryRecordsReq{
		DatasetID: l.dataset.GetBackendID(ctx),
		Query:     query,
		Metadata:  metadata,
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
