package llm

import (
	"strings"
	"testing"

	"github.com/chaitin/koalaqa/model"
)

// TestDiscussionSummaryTemplate_BuildSummaryPrompt 测试构建总结提示词
func TestDiscussionSummaryTemplate_BuildSummaryPrompt(t *testing.T) {
	// 准备测试数据
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{
				ID:        1001,
				CreatedAt: 1700000000, // 2023-11-15 02:13:20
			},
			Title:    "Redis缓存在高并发下的优化策略",
			Content:  "我们的系统在高峰期Redis响应变慢，求优化建议",
			Tags:     []string{"Redis", "缓存", "性能优化"},
			Resolved: false,
		},
		UserName: "开发小王",
	}

	allComments := []model.CommentDetail{
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        2001,
					CreatedAt: 1700000300, // 5分钟后
				},
				DiscussionID: 1001,
				ParentID:     0,
				Content:      "可以考虑Redis集群方案，分散读写压力",
				Bot:          false,
				Accepted:     false,
			},
			UserName: "用户张工",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        2002,
					CreatedAt: 1700000600, // 10分钟后
				},
				DiscussionID: 1001,
				ParentID:     2001,
				Content:      "Redis集群确实是个好方案，另外建议检查连接池配置和慢查询日志",
				Bot:          true,
				Accepted:     false,
			},
			UserName: "智能助手",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        2003,
					CreatedAt: 1700000900, // 15分钟后
				},
				DiscussionID: 1001,
				ParentID:     2001,
				Content:      "集群会增加运维复杂度，有没有其他简单的方案？",
				Bot:          false,
				Accepted:     false,
			},
			UserName: "用户李工",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        2004,
					CreatedAt: 1700001200, // 20分钟后
				},
				DiscussionID: 1001,
				ParentID:     0,
				Content:      "可以先尝试优化数据结构，使用Hash代替String存储",
				Bot:          false,
				Accepted:     true,
			},
			UserName: "用户赵工",
		},
	}

	// 创建模板实例
	template := NewDiscussionSummaryTemplate(discussion, allComments)

	// 生成提示词
	prompt, err := template.BuildSummaryPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证提示词内容
	if !strings.Contains(prompt, "Redis缓存在高并发下的优化策略") {
		t.Error("提示词应包含帖子标题")
	}

	if !strings.Contains(prompt, "评论总数：4个") {
		t.Error("提示词应包含正确的评论总数")
	}

	if !strings.Contains(prompt, "开发小王") {
		t.Error("提示词应包含发帖人")
	}

	// 检查是否包含所有参与用户（顺序可能不同）
	expectedUsers := []string{"开发小王", "用户张工", "智能助手", "用户李工", "用户赵工"}
	for _, user := range expectedUsers {
		if !strings.Contains(prompt, user) {
			t.Errorf("提示词应包含用户: %s", user)
		}
	}

	if !strings.Contains(prompt, "讨论深度：2层") {
		t.Error("提示词应包含正确的讨论深度")
	}

	if !strings.Contains(prompt, "智能助手参与：1次回复") {
		t.Error("提示词应包含BOT参与次数")
	}

	if !strings.Contains(prompt, "【已采纳】") {
		t.Error("提示词应标记已采纳的回复")
	}

	if !strings.Contains(prompt, "【BOT回复】") {
		t.Error("提示词应标记BOT回复")
	}

	t.Logf("生成的提示词长度: %d 字符", len(prompt))
	t.Logf("完整提示词:\n%s", prompt)
}

// TestDiscussionSummaryTemplate_EmptyComments 测试无评论的情况
func TestDiscussionSummaryTemplate_EmptyComments(t *testing.T) {
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{
				ID:        1002,
				CreatedAt: 1700000000,
			},
			Title:    "新手问题：如何优化数据库查询？",
			Content:  "刚入门，想了解数据库查询优化的基本方法",
			Tags:     []string{"数据库", "优化"},
			Resolved: false,
		},
		UserName: "新手小白",
	}

	template := NewDiscussionSummaryTemplate(discussion, []model.CommentDetail{})

	prompt, err := template.BuildSummaryPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	if !strings.Contains(prompt, "评论总数：0个") {
		t.Error("应正确显示0个评论")
	}

	if !strings.Contains(prompt, "暂无评论") {
		t.Error("应显示暂无评论信息")
	}

	if !strings.Contains(prompt, "新手小白") {
		t.Error("参与用户应只包含发帖人")
	}

	if strings.Contains(prompt, "智能助手参与") {
		t.Error("无评论时不应显示BOT参与信息")
	}

	t.Logf("无评论提示词:\n%s", prompt)
}

// TestDiscussionSummaryTemplate_ResolvedDiscussion 测试已解决的讨论
func TestDiscussionSummaryTemplate_ResolvedDiscussion(t *testing.T) {
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{
				ID:        1003,
				CreatedAt: 1700000000,
			},
			Title:    "如何解决内存泄漏问题？",
			Content:  "程序运行一段时间后内存占用越来越高",
			Tags:     []string{"内存管理", "调试"},
			Resolved: true, // 已解决
		},
		UserName: "困惑开发者",
	}

	allComments := []model.CommentDetail{
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        3001,
					CreatedAt: 1700000300,
				},
				DiscussionID: 1003,
				ParentID:     0,
				Content:      "使用内存分析工具检查是否有对象没有正确释放",
				Bot:          false,
				Accepted:     true,
			},
			UserName: "经验丰富者",
		},
	}

	template := NewDiscussionSummaryTemplate(discussion, allComments)

	prompt, err := template.BuildSummaryPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	if !strings.Contains(prompt, "解决状态：已解决") {
		t.Error("应正确显示已解决状态")
	}

	if !strings.Contains(prompt, "【已采纳】") {
		t.Error("应标记已采纳的回复")
	}

	t.Logf("已解决讨论提示词:\n%s", prompt)
}

// TestDiscussionSummaryTemplate_DeepComments 测试深层嵌套评论
func TestDiscussionSummaryTemplate_DeepComments(t *testing.T) {
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{
				ID:        1004,
				CreatedAt: 1700000000,
			},
			Title:    "深度讨论：微服务架构的优缺点",
			Content:  "想听听大家对微服务架构的看法",
			Tags:     []string{"微服务", "架构"},
			Resolved: false,
		},
		UserName: "架构师",
	}

	allComments := []model.CommentDetail{
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        4001,
					CreatedAt: 1700000300,
				},
				DiscussionID: 1004,
				ParentID:     0,
				Content:      "微服务可以提高系统的可扩展性",
				Bot:          false,
			},
			UserName: "支持者A",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        4002,
					CreatedAt: 1700000600,
				},
				DiscussionID: 1004,
				ParentID:     4001,
				Content:      "但也会增加系统复杂度",
				Bot:          false,
			},
			UserName: "质疑者B",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        4003,
					CreatedAt: 1700000900,
				},
				DiscussionID: 1004,
				ParentID:     4002,
				Content:      "复杂度可以通过好的工具链来管理",
				Bot:          false,
			},
			UserName: "支持者A",
		},
		{
			Comment: model.Comment{
				Base: model.Base{
					ID:        4004,
					CreatedAt: 1700001200,
				},
				DiscussionID: 1004,
				ParentID:     4003,
				Content:      "确实，现在有很多成熟的微服务框架和监控工具",
				Bot:          true,
			},
			UserName: "智能助手",
		},
	}

	template := NewDiscussionSummaryTemplate(discussion, allComments)

	prompt, err := template.BuildSummaryPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	if !strings.Contains(prompt, "讨论深度：4层") {
		t.Error("应正确计算4层深度")
	}

	if !strings.Contains(prompt, "评论总数：4个") {
		t.Error("应正确计算评论总数")
	}

	// 验证评论树结构
	if !strings.Contains(prompt, "└── 回复1.1") || !strings.Contains(prompt, "└── 回复2.1") {
		t.Error("应正确显示评论树结构")
	}

	t.Logf("深层评论提示词:\n%s", prompt)
}

// TestDiscussionSummaryTemplate_CalculateDuration 测试时间计算
func TestDiscussionSummaryTemplate_CalculateDuration(t *testing.T) {
	template := &DiscussionSummaryTemplate{}

	// 测试分钟级别
	duration := template.calculateDiscussionDuration(1700000000, 1700000300) // 5分钟
	if duration != "5分钟" {
		t.Errorf("期望 '5分钟'，得到 '%s'", duration)
	}

	// 测试小时级别
	duration = template.calculateDiscussionDuration(1700000000, 1700003600) // 1小时
	if duration != "1小时0分钟" {
		t.Errorf("期望 '1小时0分钟'，得到 '%s'", duration)
	}

	// 测试天级别
	duration = template.calculateDiscussionDuration(1700000000, 1700086400) // 1天
	if duration != "1天0小时" {
		t.Errorf("期望 '1天0小时'，得到 '%s'", duration)
	}

	// 测试相同时间
	duration = template.calculateDiscussionDuration(1700000000, 1700000000)
	if duration != "0分钟" {
		t.Errorf("期望 '0分钟'，得到 '%s'", duration)
	}
}

// TestDiscussionSummaryTemplate_FormatTime 测试时间格式化
func TestDiscussionSummaryTemplate_FormatTime(t *testing.T) {
	template := &DiscussionSummaryTemplate{}

	formatted := template.formatTime(1700000000) // 时间戳转换（时区可能不同）
	// 只验证格式是否正确，不验证具体时间值
	if len(formatted) != 19 || !strings.Contains(formatted, "2023-11-15") {
		t.Errorf("时间格式不正确，得到 '%s'", formatted)
	}
	t.Logf("格式化时间: %s", formatted)
}

// BenchmarkBuildSummaryPrompt 性能测试
func BenchmarkBuildSummaryPrompt(b *testing.B) {
	discussion := &model.DiscussionDetail{
		Discussion: model.Discussion{
			Base: model.Base{
				ID:        1001,
				CreatedAt: 1700000000,
			},
			Title:    "性能测试帖子",
			Content:  "这是一个用于性能测试的帖子内容",
			Tags:     []string{"测试", "性能"},
			Resolved: false,
		},
		UserName: "测试用户",
	}

	// 创建100条评论用于性能测试
	allComments := make([]model.CommentDetail, 100)
	for i := 0; i < 100; i++ {
		allComments[i] = model.CommentDetail{
			Comment: model.Comment{
				Base: model.Base{
					ID:        uint(2000 + i),
					CreatedAt: model.Timestamp(1700000000 + i*60),
				},
				DiscussionID: 1001,
				ParentID:     0,
				Content:      "这是测试评论内容",
				Bot:          i%10 == 0, // 每10条有一条BOT回复
			},
			UserName: "测试用户",
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		template := NewDiscussionSummaryTemplate(discussion, allComments)
		_, err := template.BuildSummaryPrompt()
		if err != nil {
			b.Fatalf("生成提示词失败: %v", err)
		}
	}
}
