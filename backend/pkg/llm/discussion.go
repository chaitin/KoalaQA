package llm

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"text/template"
	"time"

	"github.com/chaitin/koalaqa/model"
)

// DiscussionPromptTemplate 论坛智能回帖提示词模版
type DiscussionPromptTemplate struct {

	// 帖子信息
	Discussion *model.DiscussionDetail

	// 所有评论（包含用户信息）
	AllComments []model.CommentDetail

	// 触发回复的新评论
	NewComment *model.CommentDetail

	// 知识库文档
	KnowledgeDocuments []KnowledgeDocument

	// BOT的历史回复（用于保持对话连续性）
	BotHistoryReplies []model.CommentDetail

	// 评论树结构
	CommentTree []*CommentNode

	// 模版实例
	template *template.Template
}

// KnowledgeDocument 知识库文档结构
type KnowledgeDocument struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Source  string `json:"source,omitempty"`
}

// 提示词模版常量
const discussionPromptTemplate = `
## 当前帖子信息
### 帖子ID：{{.Discussion.ID}}
### 帖子标题：{{.Discussion.Title}}
### 帖子内容：{{.Discussion.Content}}
### 发帖人：{{.Discussion.UserName}}
### 发帖时间：{{formatTime .Discussion.CreatedAt}}
{{- if .Discussion.Tags}}
### 帖子标签：{{join .Discussion.Tags ", "}}
{{- end}}
### 解决状态：{{if .Discussion.Resolved}}已解决{{else}}待解决{{end}}

## 评论楼层结构
{{- if .CommentTree}}
{{- range $i, $node := .CommentTree}}
楼层{{add $i 1}} {{renderComment $node ""}}
{{- end}}
{{- else}}
暂无评论
{{- end}}

## 触发回复的新评论
{{- if .NewComment}}
### 新评论ID：{{.NewComment.ID}}
### 新评论作者：{{.NewComment.UserName}}
### 新评论内容：{{.NewComment.Content}}
### 新评论时间：{{formatTime .NewComment.CreatedAt}}
{{- if ne .NewComment.ParentID 0}}
### 父评论ID：{{.NewComment.ParentID}}（这是对某个评论的回复）
{{- $parentComment := findCommentByID $.AllComments .NewComment.ParentID}}
{{- if $parentComment}}
### 父评论内容：{{$parentComment.Content}}
### 父评论作者：{{$parentComment.UserName}}
{{- end}}
{{- else}}
### 这是对主帖的直接回复
{{- end}}
{{- else}}
暂无新评论
{{- end}}

{{- if .BotHistoryReplies}}
### 你的历史回复：
{{- range $i, $reply := .BotHistoryReplies}}
{{add $i 1}}. [ID: {{$reply.ID}}]
{{- end}}
{{- end}}

### 回复策略指导：
{{- if .NewComment}}
{{- if ne .NewComment.ParentID 0}}
{{- $isReplyToBot := isReplyToBot .BotHistoryReplies .NewComment.ParentID}}
{{- if $isReplyToBot}}
- 新评论是对你之前回复的反馈，请展现连续对话能力，确认理解并提供进一步帮助
{{- else}}
- 新评论是对其他用户的回复，请结合上下文提供补充信息或不同观点
{{- end}}
{{- else}}
- 新评论是对主帖的直接回复，请结合已有讨论提供有价值的补充信息
{{- end}}
{{- end}}

{{- if .Discussion.Resolved}}
- 讨论已解决，可以确认解决方案的有效性或提供额外的相关建议
{{- else}}
- 问题尚未解决，重点提供实用的解决方案
{{- end}}

## 知识库文档
{{- if .KnowledgeDocuments}}
{{- range $i, $doc := .KnowledgeDocuments}}
### 文档{{add $i 1}}：{{$doc.Title}}
{{- if $doc.Source}}
来源：{{$doc.Source}}
{{- end}}
内容：
{{$doc.Content}}

{{- end}}

{{- end}}

## 回复要求
{{- if .NewComment}}
**回复目标**：针对新评论ID {{.NewComment.ID}} 进行回复
{{- end}}

请基于以上信息生成你的回复内容：`

// CommentNode 评论节点，用于构建层级结构
type CommentNode struct {
	Comment  model.CommentDetail
	Children []*CommentNode
	Level    int
	IsNew    bool
	IsBot    bool
}

// BuildPrompt 构建完整的提示词
func (t *DiscussionPromptTemplate) BuildPrompt() (string, error) {
	// 确保模版已初始化
	if t.template == nil {
		if err := t.initTemplate(); err != nil {
			return "", fmt.Errorf("初始化模版失败: %w", err)
		}
	}

	// 构建评论树
	t.CommentTree = t.buildCommentTree()

	// 提取BOT历史回复
	t.ExtractBotReplies()

	// 执行模版
	var buf bytes.Buffer
	if err := t.template.Execute(&buf, t); err != nil {
		return "", fmt.Errorf("执行模版失败: %w", err)
	}

	return buf.String(), nil
}

// initTemplate 初始化模版
func (t *DiscussionPromptTemplate) initTemplate() error {
	funcMap := template.FuncMap{
		"formatTime":      t.formatTime,
		"join":            strings.Join,
		"add":             func(a, b int) int { return a + b },
		"renderComment":   t.renderComment,
		"findCommentByID": t.findCommentByID,
		"isReplyToBot":    t.isReplyToBot,
	}

	tmpl, err := template.New("discussion_prompt").Funcs(funcMap).Parse(discussionPromptTemplate)
	if err != nil {
		return err
	}

	t.template = tmpl
	return nil
}

// formatTime 格式化时间
func (t *DiscussionPromptTemplate) formatTime(timestamp model.Timestamp) string {
	return time.Unix(int64(timestamp), 0).Format("2006-01-02 15:04:05")
}

// renderComment 渲染评论节点（用于模版）
func (t *DiscussionPromptTemplate) renderComment(node *CommentNode, prefix string) string {
	var builder strings.Builder
	t.renderCommentNode(&builder, node, prefix)
	return builder.String()
}

// buildCommentTree 构建评论树结构
func (t *DiscussionPromptTemplate) buildCommentTree() []*CommentNode {
	// 创建评论映射
	commentMap := make(map[uint]*CommentNode)
	var rootNodes []*CommentNode

	// 创建所有节点
	for _, comment := range t.AllComments {
		node := &CommentNode{
			Comment: comment,
			IsNew:   t.NewComment != nil && comment.ID == t.NewComment.ID,
			IsBot:   comment.Bot,
			Level:   0,
		}
		commentMap[comment.ID] = node
	}

	// 建立父子关系
	for _, comment := range t.AllComments {
		node := commentMap[comment.ID]
		if comment.ParentID == 0 {
			// 根评论
			rootNodes = append(rootNodes, node)
		} else {
			// 子评论
			if parentNode, exists := commentMap[comment.ParentID]; exists {
				parentNode.Children = append(parentNode.Children, node)
				node.Level = parentNode.Level + 1
			}
		}
	}

	// 按创建时间排序根评论
	sort.Slice(rootNodes, func(i, j int) bool {
		return rootNodes[i].Comment.CreatedAt < rootNodes[j].Comment.CreatedAt
	})

	// 递归排序子评论
	for _, root := range rootNodes {
		t.sortChildComments(root)
	}

	return rootNodes
}

// sortChildComments 递归排序子评论
func (t *DiscussionPromptTemplate) sortChildComments(node *CommentNode) {
	if len(node.Children) == 0 {
		return
	}

	sort.Slice(node.Children, func(i, j int) bool {
		return node.Children[i].Comment.CreatedAt < node.Children[j].Comment.CreatedAt
	})

	for _, child := range node.Children {
		t.sortChildComments(child)
	}
}

// renderCommentNode 渲染评论节点
func (t *DiscussionPromptTemplate) renderCommentNode(builder *strings.Builder, node *CommentNode, prefix string) {
	// 构建评论标识
	var tags []string
	if node.IsBot {
		tags = append(tags, "BOT回复")
	}
	if node.IsNew {
		tags = append(tags, "NEW")
	}
	if node.Comment.Accepted {
		tags = append(tags, "已采纳")
	}

	tagStr := ""
	if len(tags) > 0 {
		tagStr = fmt.Sprintf(" 【%s】", strings.Join(tags, "，"))
	}

	// 渲染当前评论
	builder.WriteString(fmt.Sprintf("[ID: %d] - %s (%s)%s\n",
		node.Comment.ID,
		node.Comment.UserName,
		t.formatTime(node.Comment.CreatedAt),
		tagStr,
	))

	builder.WriteString(fmt.Sprintf("%s内容：%s\n", prefix, node.Comment.Content))

	// 渲染子评论
	for i, child := range node.Children {
		var childPrefix string
		if i == len(node.Children)-1 {
			builder.WriteString(fmt.Sprintf("%s└── 回复%d.%d ", prefix, node.Level+1, i+1))
			childPrefix = prefix + "    "
		} else {
			builder.WriteString(fmt.Sprintf("%s├── 回复%d.%d ", prefix, node.Level+1, i+1))
			childPrefix = prefix + "│   "
		}
		t.renderCommentNode(builder, child, childPrefix)
	}
}

// findCommentByID 根据ID查找评论（用于模版）
func (t *DiscussionPromptTemplate) findCommentByID(comments []model.CommentDetail, id uint) *model.CommentDetail {
	for _, comment := range comments {
		if comment.ID == id {
			return &comment
		}
	}
	return nil
}

// isReplyToBot 检查是否是对BOT回复的响应（用于模版）
func (t *DiscussionPromptTemplate) isReplyToBot(botReplies []model.CommentDetail, parentID uint) bool {
	for _, botReply := range botReplies {
		if botReply.ID == parentID {
			return true
		}
	}
	return false
}

// ExtractBotReplies 提取BOT的历史回复
func (t *DiscussionPromptTemplate) ExtractBotReplies() {
	t.BotHistoryReplies = make([]model.CommentDetail, 0)
	for _, comment := range t.AllComments {
		if comment.Bot && (t.NewComment == nil || comment.ID != t.NewComment.ID) {
			t.BotHistoryReplies = append(t.BotHistoryReplies, comment)
		}
	}

	// 按时间排序
	sort.Slice(t.BotHistoryReplies, func(i, j int) bool {
		return t.BotHistoryReplies[i].CreatedAt < t.BotHistoryReplies[j].CreatedAt
	})
}

// NewDiscussionPromptTemplate 创建新的提示词模版实例
func NewDiscussionPromptTemplate(
	discussion *model.DiscussionDetail,
	allComments []model.CommentDetail,
	newComment *model.CommentDetail,
	knowledgeDocs []KnowledgeDocument,
) *DiscussionPromptTemplate {
	return &DiscussionPromptTemplate{
		Discussion:         discussion,
		AllComments:        allComments,
		NewComment:         newComment,
		KnowledgeDocuments: knowledgeDocs,
	}
}

// 使用示例：
/*
func ExampleUsage() {
	// 准备数据
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{ID: 1001},
			Title: "Redis缓存在高并发下的优化策略",
			Content: "我们的系统在高峰期Redis响应变慢，求优化建议",
			Tags: []string{"Redis", "缓存", "性能优化"},
			Resolved: false,
		},
		UserName: "开发小王",
	}

	allComments := []model.CommentDetail{
		{
			Comment: model.Comment{
				Base: model.Base{ID: 2001},
				DiscussionID: 1001,
				ParentID: 0,
				Content: "可以考虑Redis集群方案",
				Bot: false,
			},
			UserName: "用户张工",
		},
		{
			Comment: model.Comment{
				Base: model.Base{ID: 2002},
				DiscussionID: 1001,
				ParentID: 2001,
				Content: "Redis集群确实是个好方案，根据文档建议...",
				Bot: true,
			},
			UserName: "智能助手",
		},
	}

	newComment := &model.CommentDetail{
		Comment: model.Comment{
			Base: model.Base{ID: 2003},
			DiscussionID: 1001,
			ParentID: 2001,
			Content: "但是集群会增加运维复杂度，有没有其他方案？",
			Bot: false,
		},
		UserName: "用户李工",
	}

	knowledgeDocs := []KnowledgeDocument{
		{
			Title: "Redis性能优化最佳实践",
			Content: "1. 使用连接池\n2. 合理设置过期时间\n3. 避免大key...",
			Source: "Redis官方文档",
		},
	}

	// 创建模版实例
	template := NewDiscussionPromptTemplate(discussion, allComments, newComment, knowledgeDocs)

	// 生成提示词
	prompt, err := template.BuildPrompt()
	if err != nil {
		log.Printf("生成提示词失败: %v", err)
		return
	}

	// 使用提示词调用大模型
	// response := callLLMWithPrompt(prompt)
	fmt.Println(prompt)
}
*/
