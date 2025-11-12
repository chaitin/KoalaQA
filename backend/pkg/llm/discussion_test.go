package llm

import (
	"fmt"
	"testing"
	"time"

	"github.com/chaitin/koalaqa/model"
)

// 测试辅助函数：创建测试用的讨论数据
func createTestDiscussion() *model.DiscussionDetail {
	return &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base:     model.Base{ID: 1001, CreatedAt: model.Timestamp(time.Now().Unix())},
			Title:    "Redis缓存在高并发下的优化策略",
			Content:  "我们的系统在高峰期Redis响应变慢，求优化建议",
			Tags:     []string{"Redis", "缓存", "性能优化"},
			Resolved: false,
		},
		UserName: "开发小王",
	}
}

// 测试辅助函数：创建测试用的评论数据
func createTestComments() []model.CommentDetail {
	now := time.Now().Unix()
	return []model.CommentDetail{
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2001, CreatedAt: model.Timestamp(now)},
				DiscussionID: 1001,
				ParentID:     0,
				UserID:       101,
				Content:      "可以考虑Redis集群方案",
				Bot:          false,
			},
			UserName: "用户张工",
		},
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2002, CreatedAt: model.Timestamp(now + 60)},
				DiscussionID: 1001,
				ParentID:     2001,
				UserID:       999, // BOT用户ID
				Content:      "Redis集群确实是个好方案，根据相关文档，集群能够提供更好的可用性和扩展性...",
				Bot:          true,
				Accepted:     true,
			},
			UserName: "智能助手",
		},
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2003, CreatedAt: model.Timestamp(now + 120)},
				DiscussionID: 1001,
				ParentID:     2001,
				UserID:       102,
				Content:      "但是集群会增加运维复杂度，有没有其他方案？",
				Bot:          false,
			},
			UserName: "用户李工",
		},
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2004, CreatedAt: model.Timestamp(now + 180)},
				DiscussionID: 1001,
				ParentID:     2002,
				UserID:       103,
				Content:      "感谢智能助手的回复，我想了解更多细节",
				Bot:          false,
			},
			UserName: "用户王工",
		},
	}
}

// TestFullPromptWithAllFeatures 测试包含所有特性的完整提示词
func TestFullPromptWithAllFeatures(t *testing.T) {
	discussion := createTestDiscussion()
	discussion.Tags = []string{"Redis", "缓存", "性能优化", "高并发"}

	allComments := createTestComments()
	newComment := &allComments[3] // 对BOT回复的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildFullPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	fmt.Println(prompt)
}

func TestBuildPostPrompt(t *testing.T) {
	discussion := createTestDiscussion()
	discussion.Tags = []string{"Redis", "缓存", "性能优化", "高并发"}

	allComments := createTestComments()

	template := NewDiscussionPromptTemplate(discussion, allComments, nil)

	prompt, err := template.BuildPostPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	fmt.Println(prompt)
}
