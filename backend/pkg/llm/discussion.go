package llm

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"text/template"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/util"
)

// DiscussionPromptTemplate 论坛智能回帖提示词模版
type DiscussionPromptTemplate struct {
	// 帖子信息
	Discussion *model.DiscussionDetail

	// 所有评论（包含用户信息）
	AllComments []model.CommentDetail

	// 触发回复的新评论
	NewComment *model.CommentDetail

	// 评论树结构
	CommentTree []*CommentNode

	// 模版实例
	template *template.Template
}

type KnowledgeDocument struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Source  string `json:"source,omitempty"`
	QA      bool   `json:"qa"`
}

const discussionFullTemplate = `
## 当前帖子信息
帖子ID：{{.Discussion.ID}}
帖子标题：{{.Discussion.Title}}
帖子内容：{{.Discussion.Content}}
发帖人：{{.Discussion.UserName}}
发帖时间：{{formatTime .Discussion.CreatedAt}}
{{- if .Discussion.Groups}}
帖子分组：{{renderGroups .Discussion.Groups}}
{{- end}}
{{- if .Discussion.Tags}}
帖子标签：{{join .Discussion.Tags ", "}}
{{- end}}
解决状态：{{getDiscState .Discussion.Resolved}}

## 评论楼层结构
{{- if .CommentTree}}
{{- range $i, $node := .CommentTree}}
楼层{{add $i 1}} {{renderComment $node ""}}
{{- end}}
{{- else}}
暂无评论
{{- end}}
`

var discussionsFullTemplate = template.New("discussions_full_template")

const discussionsFullTemplateStr = `
## 帖子信息
{{- if gt (len .) 0}}
{{- range $j, $disc := .}}
### 帖子{{add $j 1}}
帖子ID：{{$disc.Discussion.ID}}
帖子标题：{{$disc.Discussion.Title}}
帖子内容：{{$disc.Discussion.Content}}
发帖人：{{$disc.Discussion.UserName}}
发帖时间：{{formatTime $disc.Discussion.CreatedAt}}
{{- if .Discussion.Groups}}
帖子分组：{{renderGroups .Discussion.Groups}}
{{- end}}
{{- if $disc.Discussion.Tags}}
帖子标签：{{join $disc.Discussion.Tags ", "}}
{{- end}}
解决状态：{{getDiscState $disc.Discussion.Resolved}}

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
		"renderGroups":  renderGroups,
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

// BuildFullPrompt 构建完整的提示词
func (t *DiscussionPromptTemplate) BuildFullPrompt() (string, error) {
	if err := t.initFullTemplate(); err != nil {
		return "", fmt.Errorf("初始化完整模版失败: %w", err)
	}

	// 清理帖子内容中的无意义内容（base64图片、冗长日志等），避免 token 超限
	// maxLen=8000 约为 ~3000-4000 tokens，为知识库检索和回复留出空间
	t.Discussion.Content = util.CleanContentForLLM(t.Discussion.Content, 8000)
	if t.NewComment != nil {
		t.NewComment.Content = util.CleanContentForLLM(t.NewComment.Content, 1000)
	}

	// 构建评论树
	t.CommentTree = t.buildCommentTree()

	// 执行模版
	var buf bytes.Buffer
	if err := t.template.Execute(&buf, t); err != nil {
		return "", fmt.Errorf("执行完整模版失败: %w", err)
	}

	return buf.String(), nil
}

// BuildContentForRetrieval 构建用于检索的纯内容文本（不包含任何标签和提示词）
func (t *DiscussionPromptTemplate) BuildContentForRetrieval() string {
	var builder strings.Builder

	// 添加帖子标题和内容
	builder.WriteString(t.Discussion.Title)
	builder.WriteString("\n")
	builder.WriteString(t.Discussion.Content)
	builder.WriteString("\n")

	// 添加所有评论内容（按时间排序）
	comments := make([]model.CommentDetail, len(t.AllComments))
	copy(comments, t.AllComments)
	sort.Slice(comments, func(i, j int) bool {
		return comments[i].CreatedAt < comments[j].CreatedAt
	})

	for _, comment := range comments {
		builder.WriteString(comment.Content)
		builder.WriteString("\n")
	}

	return strings.TrimSpace(builder.String())
}

// initFullTemplate 初始化完整模版
func (t *DiscussionPromptTemplate) initFullTemplate() error {
	funcMap := template.FuncMap{
		"formatTime":    formatTime,
		"join":          strings.Join,
		"add":           add,
		"renderGroups":  renderGroups,
		"renderComment": renderComment,
		"getDiscState":  getDiscState,
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
		comment.Content = util.CleanContentForLLM(comment.Content, 1000)
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
