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

// DiscussionSummaryTemplate 帖子总结提示词模板
type DiscussionSummaryTemplate struct {
	// 帖子信息
	Discussion *model.DiscussionDetail

	// 所有评论（包含用户信息）
	AllComments []model.CommentDetail

	// 评论树结构
	CommentTree []*CommentNode

	// BOT的历史回复
	BotHistoryReplies []model.CommentDetail

	// 总结统计信息
	CommentCount     int             // 评论总数
	ParticipantUsers []string        // 参与用户列表
	MaxCommentLevel  int             // 最大评论层级
	LatestReplyTime  model.Timestamp // 最新回复时间

	// 模版实例
	template *template.Template
}

// 帖子总结提示词模版常量
const discussionSummaryTemplate = `
## 帖子基本信息
### 帖子ID：{{.Discussion.ID}}
### 帖子标题：{{.Discussion.Title}}
### 帖子内容：{{.Discussion.Content}}
### 发帖人：{{.Discussion.UserName}}
### 发帖时间：{{formatTime .Discussion.CreatedAt}}
{{- if .Discussion.Tags}}
### 帖子标签：{{join .Discussion.Tags ", "}}
{{- end}}
### 解决状态：{{if .Discussion.Resolved}}已解决{{else}}待解决{{end}}

## 讨论参与情况
### 评论总数：{{.CommentCount}}个
### 参与用户：{{join .ParticipantUsers ", "}}
### 讨论深度：{{.MaxCommentLevel}}层
{{- if gt .CommentCount 0}}
### 最新回复时间：{{formatTime .LatestReplyTime}}
### 讨论时长：{{calculateDiscussionDuration .Discussion.CreatedAt .LatestReplyTime}}
{{- end}}
{{- if .BotHistoryReplies}}
### 智能助手参与：{{len .BotHistoryReplies}}次回复
{{- end}}

## 评论楼层详情
{{- if .CommentTree}}
{{- range $i, $node := .CommentTree}}
### 楼层{{add $i 1}}
{{renderComment $node ""}}
{{- end}}
{{- else}}
### 暂无评论
{{- end}}

## 讨论总结要求
请基于以上帖子信息和讨论内容，生成一个结构化的总结，包括：
1. 核心问题或主题
2. 主要讨论观点
3. 解决方案（如果有）
4. 讨论结论或当前状态
`

// BuildSummaryPrompt 构建总结提示词
func (t *DiscussionSummaryTemplate) BuildSummaryPrompt() (string, error) {
	// 确保模版已初始化
	if t.template == nil {
		if err := t.initTemplate(); err != nil {
			return "", fmt.Errorf("初始化总结模版失败: %w", err)
		}
	}

	// 构建评论树和统计信息
	t.CommentTree = t.buildCommentTree()
	t.extractBotReplies()
	t.calculateSummaryStats()

	// 执行模版
	var buf bytes.Buffer
	if err := t.template.Execute(&buf, t); err != nil {
		return "", fmt.Errorf("执行总结模版失败: %w", err)
	}

	return buf.String(), nil
}

// initTemplate 初始化模版
func (t *DiscussionSummaryTemplate) initTemplate() error {
	funcMap := template.FuncMap{
		"formatTime":                  t.formatTime,
		"join":                        strings.Join,
		"add":                         func(a, b int) int { return a + b },
		"gt":                          func(a, b int) bool { return a > b },
		"renderComment":               t.renderComment,
		"calculateDiscussionDuration": t.calculateDiscussionDuration,
		"len": func(slice interface{}) int {
			switch s := slice.(type) {
			case []model.CommentDetail:
				return len(s)
			case []string:
				return len(s)
			default:
				return 0
			}
		},
	}

	tmpl, err := template.New("discussion_summary").Funcs(funcMap).Parse(discussionSummaryTemplate)
	if err != nil {
		return err
	}

	t.template = tmpl
	return nil
}

// calculateSummaryStats 计算总结统计信息
func (t *DiscussionSummaryTemplate) calculateSummaryStats() {
	// 计算评论总数
	t.CommentCount = len(t.AllComments)

	// 提取参与用户
	userMap := make(map[string]bool)
	userMap[t.Discussion.UserName] = true // 添加发帖人

	for _, comment := range t.AllComments {
		userMap[comment.UserName] = true
	}

	t.ParticipantUsers = make([]string, 0, len(userMap))
	for user := range userMap {
		t.ParticipantUsers = append(t.ParticipantUsers, user)
	}

	// 计算最大评论层级
	t.MaxCommentLevel = 0
	for _, node := range t.CommentTree {
		maxLevel := t.calculateMaxLevel(node, 1)
		if maxLevel > t.MaxCommentLevel {
			t.MaxCommentLevel = maxLevel
		}
	}

	// 计算最新回复时间
	t.LatestReplyTime = t.Discussion.CreatedAt
	for _, comment := range t.AllComments {
		if comment.UpdatedAt > t.LatestReplyTime {
			t.LatestReplyTime = comment.UpdatedAt
		}
	}
}

// buildCommentTree 构建评论树结构
func (t *DiscussionSummaryTemplate) buildCommentTree() []*CommentNode {
	// 创建评论映射
	commentMap := make(map[uint]*CommentNode)
	var rootNodes []*CommentNode

	// 创建所有节点
	for _, comment := range t.AllComments {
		node := &CommentNode{
			Comment: comment,
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
func (t *DiscussionSummaryTemplate) sortChildComments(node *CommentNode) {
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

// calculateMaxLevel 计算节点的最大层级
func (t *DiscussionSummaryTemplate) calculateMaxLevel(node *CommentNode, currentLevel int) int {
	maxLevel := currentLevel
	for _, child := range node.Children {
		childMaxLevel := t.calculateMaxLevel(child, currentLevel+1)
		if childMaxLevel > maxLevel {
			maxLevel = childMaxLevel
		}
	}
	return maxLevel
}

// extractBotReplies 提取BOT的历史回复
func (t *DiscussionSummaryTemplate) extractBotReplies() {
	t.BotHistoryReplies = make([]model.CommentDetail, 0)
	for _, comment := range t.AllComments {
		if comment.Bot {
			t.BotHistoryReplies = append(t.BotHistoryReplies, comment)
		}
	}

	// 按时间排序
	sort.Slice(t.BotHistoryReplies, func(i, j int) bool {
		return t.BotHistoryReplies[i].CreatedAt < t.BotHistoryReplies[j].CreatedAt
	})
}

// formatTime 格式化时间
func (t *DiscussionSummaryTemplate) formatTime(timestamp model.Timestamp) string {
	return time.Unix(int64(timestamp), 0).Format("2006-01-02 15:04:05")
}

// renderComment 渲染评论节点（用于模版）
func (t *DiscussionSummaryTemplate) renderComment(node *CommentNode, prefix string) string {
	var builder strings.Builder
	t.renderCommentNode(&builder, node, prefix)
	return builder.String()
}

// renderCommentNode 渲染评论节点
func (t *DiscussionSummaryTemplate) renderCommentNode(builder *strings.Builder, node *CommentNode, prefix string) {
	// 构建评论标识
	var tags []string
	if node.IsBot {
		tags = append(tags, "BOT回复")
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

// calculateDiscussionDuration 计算讨论持续时间
func (t *DiscussionSummaryTemplate) calculateDiscussionDuration(startTime, endTime model.Timestamp) string {
	if endTime <= startTime {
		return "0分钟"
	}

	duration := time.Unix(int64(endTime), 0).Sub(time.Unix(int64(startTime), 0))

	days := int(duration.Hours() / 24)
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%d天%d小时", days, hours)
	} else if hours > 0 {
		return fmt.Sprintf("%d小时%d分钟", hours, minutes)
	} else {
		return fmt.Sprintf("%d分钟", minutes)
	}
}

// NewDiscussionSummaryTemplate 创建新的总结模版实例
func NewDiscussionSummaryTemplate(
	discussion *model.DiscussionDetail,
	allComments []model.CommentDetail,
) *DiscussionSummaryTemplate {
	return &DiscussionSummaryTemplate{
		Discussion:  discussion,
		AllComments: allComments,
	}
}
