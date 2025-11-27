package llm

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"text/template"

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

	// BOT的历史回复（用于保持对话连续性）
	BotHistoryReplies []model.CommentDetail

	// 评论树结构
	CommentTree []*CommentNode

	// 模版实例
	template *template.Template
}

type KnowledgeDocument struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Source  string `json:"source,omitempty"`
}

const discussionPostTemplate = `
### ID：{{.Discussion.ID}}
### 标题：{{.Discussion.Title}}
### 内容：{{.Discussion.Content}}
### 发帖人：{{.Discussion.UserName}}
### 时间：{{formatTime .Discussion.CreatedAt}}
{{- if .Discussion.Tags}}
### 标签：{{join .Discussion.Tags ", "}}
{{- end}}
### 解决状态：{{getDiscState .Discussion.Resolved}}

{{- if .CommentTree}}
## 评论楼层结构
{{- range $i, $node := .CommentTree}}
楼层{{add $i 1}} {{renderComment $node ""}}
{{- end}}
{{- end}}
`

const discussionFullTemplate = `
## 当前帖子信息
### 帖子ID：{{.Discussion.ID}}
### 帖子标题：{{.Discussion.Title}}
### 帖子内容：{{.Discussion.Content}}
### 发帖人：{{.Discussion.UserName}}
### 发帖时间：{{formatTime .Discussion.CreatedAt}}
{{- if .Discussion.Tags}}
### 帖子标签：{{join .Discussion.Tags ", "}}
{{- end}}
### 解决状态：{{getDiscState .Discussion.Resolved}}

## 评论楼层结构
{{- if .CommentTree}}
{{- range $i, $node := .CommentTree}}
楼层{{add $i 1}} {{renderComment $node ""}}
{{- end}}
{{- else}}
暂无评论
{{- end}}

{{- if .NewComment}}
针对新评论ID {{.NewComment.ID}} 进行回复
{{- end}}
`

var discussionsFullTemplate = template.New("discussions_full_template")

const discussionsFullTemplateStr = `
## 帖子信息
{{- if gt (len .) 0}}
{{- range $j, $disc := .}}
### 帖子{{add $j 1}}
#### 帖子ID：{{$disc.Discussion.ID}}
#### 帖子标题：{{$disc.Discussion.Title}}
#### 帖子内容：{{$disc.Discussion.Content}}
#### 发帖人：{{$disc.Discussion.UserName}}
#### 发帖时间：{{formatTime $disc.Discussion.CreatedAt}}
{{- if $disc.Discussion.Tags}}
#### 帖子标签：{{join $disc.Discussion.Tags ", "}}
{{- end}}
#### 解决状态：{{getDiscState $disc.Discussion.Resolved}}

### 帖子{{add $j 1}}评论楼层结构
{{- if $disc.CommentTree}}
{{- range $i, $node := $disc.CommentTree}}
楼层{{add $i 1}} {{renderComment $node ""}}
{{- end}}
{{- else}}
暂无评论
{{- end}}
{{- end}}
{{- else}}
暂无信息
{{- end}}
`

func init() {
	var err error
	discussionsFullTemplate, err = discussionsFullTemplate.Funcs(template.FuncMap{
		"formatTime":    formatTime,
		"join":          strings.Join,
		"add":           func(a, b int) int { return a + b },
		"renderComment": renderComment,
		"getDiscState":  getDiscState,
	}).Parse(discussionsFullTemplateStr)
	if err != nil {
		panic(err)
	}
}

// CommentNode 评论节点，用于构建层级结构
type CommentNode struct {
	Comment  model.CommentDetail
	Children []*CommentNode
	Level    int
	IsNew    bool
	IsBot    bool
}

func (t *DiscussionPromptTemplate) Question() string {
	q := t.Discussion.Title
	if t.Discussion.Content != "" {
		q += " " + t.Discussion.Content
	}
	if t.NewComment != nil {
		q += " " + t.NewComment.Content
	}
	return q
}

// BuildPostPrompt 构建帖子提示词
func (t *DiscussionPromptTemplate) BuildPostPrompt() (string, error) {
	// 初始化帖子模版
	if err := t.initPostTemplate(); err != nil {
		return "", fmt.Errorf("初始化帖子模版失败: %w", err)
	}

	// 构建评论树
	t.CommentTree = t.buildCommentTree()

	var buf bytes.Buffer
	if err := t.template.Execute(&buf, t); err != nil {
		return "", fmt.Errorf("执行帖子模版失败: %w", err)
	}

	return buf.String(), nil
}

// BuildFullPrompt 构建完整的提示词
func (t *DiscussionPromptTemplate) BuildFullPrompt() (string, error) {
	if err := t.initFullTemplate(); err != nil {
		return "", fmt.Errorf("初始化完整模版失败: %w", err)
	}

	// 构建评论树
	t.CommentTree = t.buildCommentTree()

	// 提取BOT历史回复
	t.ExtractBotReplies()

	// 执行模版
	var buf bytes.Buffer
	if err := t.template.Execute(&buf, t); err != nil {
		return "", fmt.Errorf("执行完整模版失败: %w", err)
	}

	return buf.String(), nil
}

// initTemplate 初始化模版（兼容性方法，根据是否有新评论选择模版）
func (t *DiscussionPromptTemplate) initTemplate() error {
	if t.NewComment != nil {
		return t.initFullTemplate()
	}
	return t.initPostTemplate()
}

// initPostTemplate 初始化帖子模版
func (t *DiscussionPromptTemplate) initPostTemplate() error {
	funcMap := template.FuncMap{
		"formatTime":      formatTime,
		"join":            strings.Join,
		"add":             add,
		"renderComment":   renderComment,
		"findCommentByID": t.findCommentByID,
		"isReplyToBot":    t.isReplyToBot,
		"getDiscState":    getDiscState,
	}

	tmpl, err := template.New("discussion_post_prompt").Funcs(funcMap).Parse(discussionPostTemplate)
	if err != nil {
		return err
	}

	t.template = tmpl
	return nil
}

// initFullTemplate 初始化完整模版
func (t *DiscussionPromptTemplate) initFullTemplate() error {
	funcMap := template.FuncMap{
		"formatTime":      formatTime,
		"join":            strings.Join,
		"add":             add,
		"renderComment":   renderComment,
		"findCommentByID": t.findCommentByID,
		"isReplyToBot":    t.isReplyToBot,
		"getDiscState":    getDiscState,
	}

	tmpl, err := template.New("discussion_full_prompt").Funcs(funcMap).Parse(discussionFullTemplate)
	if err != nil {
		return err
	}

	t.template = tmpl
	return nil
}

// buildCommentTree 构建评论树结构
func (t *DiscussionPromptTemplate) buildCommentTree() []*CommentNode {
	if len(t.AllComments) == 0 {
		return nil
	}

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
) *DiscussionPromptTemplate {
	return &DiscussionPromptTemplate{
		Discussion:  discussion,
		AllComments: allComments,
		NewComment:  newComment,
	}
}

type DiscussionPromptTemplates []DiscussionPromptTemplate

func (d DiscussionPromptTemplates) BuildFullPrompt() (string, error) {
	for i := range d {
		d[i].CommentTree = d[i].buildCommentTree()
	}

	var buf bytes.Buffer
	err := discussionsFullTemplate.Execute(&buf, d)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}
