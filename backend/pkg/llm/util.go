package llm

import (
	"fmt"
	"strings"
	"time"

	"github.com/chaitin/koalaqa/model"
)

func getDiscType(t model.DiscussionType) string {
	switch t {
	case model.DiscussionTypeQA:
		return "问答"
	case model.DiscussionTypeBlog:
		return "文章"
	case model.DiscussionTypeFeedback:
		return "反馈"
	case model.DiscussionTypeIssue:
		return "Issue"
	default:
		return "未知"
	}
}

func getDiscState(state model.DiscussionState) string {
	switch state {
	case model.DiscussionStateNone:
		return "待解决"
	case model.DiscussionStateResolved:
		return "已解决"
	case model.DiscussionStateClosed:
		return "已关闭"
	case model.DiscussionStateInProgress:
		return "进行中"
	default:
		return "未知"
	}
}

// formatTime 格式化时间
func formatTime(timestamp model.Timestamp) string {
	return time.Unix(int64(timestamp), 0).Format("2006-01-02 15:04:05")
}

// renderComment 渲染评论节点（用于模版）
func renderComment(node *CommentNode, prefix string) string {
	var builder strings.Builder
	renderCommentNode(&builder, node, prefix)
	return builder.String()
}

// renderCommentNode 渲染评论节点
func renderCommentNode(builder *strings.Builder, node *CommentNode, prefix string) {
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
	builder.WriteString(fmt.Sprintf("[ID: %d] - %s (UserID: %d) (%s)%s\n",
		node.Comment.ID,
		node.Comment.UserName,
		node.Comment.UserID,
		formatTime(node.Comment.CreatedAt),
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
		renderCommentNode(builder, child, childPrefix)
	}
}

func add(a, b int) int {
	return a + b
}
