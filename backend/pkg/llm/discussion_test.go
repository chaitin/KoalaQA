package llm

import (
	"fmt"
	"strings"
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

// TestBasicPromptGeneration 测试基础提示词生成
func TestBasicPromptGeneration(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[2] // 用户李工的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}
	fmt.Println(prompt)
	// 验证提示词包含关键信息
	if !strings.Contains(prompt, "Redis缓存在高并发下的优化策略") {
		t.Error("提示词应包含帖子标题")
	}

	if !strings.Contains(prompt, "新评论ID：2003") {
		t.Error("提示词应包含新评论ID")
	}

	if !strings.Contains(prompt, "用户李工") {
		t.Error("提示词应包含新评论作者")
	}

	if !strings.Contains(prompt, "父评论ID：2001") {
		t.Error("提示词应包含父评论信息")
	}

	if !strings.Contains(prompt, "Redis性能优化最佳实践") {
		t.Error("提示词应包含知识文档")
	}

	t.Logf("生成的提示词长度: %d 字符", len(prompt))
}

// TestCommentTreeStructure 测试评论树结构构建
func TestCommentTreeStructure(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()

	template := NewDiscussionPromptTemplate(discussion, allComments, nil)
	commentTree := template.buildCommentTree()

	// 验证根评论数量
	if len(commentTree) != 1 {
		t.Errorf("期望1个根评论，实际得到%d个", len(commentTree))
	}

	// 验证第一个根评论
	rootNode := commentTree[0]
	if rootNode.Comment.ID != 2001 {
		t.Errorf("期望根评论ID为2001，实际为%d", rootNode.Comment.ID)
	}

	// 验证子评论数量
	if len(rootNode.Children) != 2 {
		t.Errorf("期望根评论有2个子评论，实际有%d个", len(rootNode.Children))
	}

	// 验证BOT回复标记
	botChild := rootNode.Children[0]
	if !botChild.IsBot {
		t.Error("期望第一个子评论被标记为BOT回复")
	}

	// 验证子评论的子评论
	if len(botChild.Children) != 1 {
		t.Errorf("期望BOT回复有1个子评论，实际有%d个", len(botChild.Children))
	}
}

// TestBotReplyDetection 测试BOT回复检测
func TestBotReplyDetection(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[3] // 对BOT回复的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)
	template.ExtractBotReplies()

	// 验证BOT历史回复提取
	if len(template.BotHistoryReplies) != 1 {
		t.Errorf("期望1个BOT历史回复，实际得到%d个", len(template.BotHistoryReplies))
	}

	botReply := template.BotHistoryReplies[0]
	if botReply.ID != 2002 {
		t.Errorf("期望BOT回复ID为2002，实际为%d", botReply.ID)
	}

	// 测试isReplyToBot函数
	isReply := template.isReplyToBot(template.BotHistoryReplies, 2002)
	if !isReply {
		t.Error("应该检测到这是对BOT回复的响应")
	}

	notReply := template.isReplyToBot(template.BotHistoryReplies, 2001)
	if notReply {
		t.Error("不应该检测到这是对BOT回复的响应")
	}
}

// TestPromptWithReplyToBot 测试对BOT回复的场景
func TestPromptWithReplyToBot(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[3] // 对BOT回复的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证包含BOT回复连续性指导
	if !strings.Contains(prompt, "新评论是对你之前回复的反馈") {
		t.Error("提示词应包含BOT回复连续性指导")
	}

	// 验证包含历史回复信息
	if !strings.Contains(prompt, "你的历史回复") {
		t.Error("提示词应包含BOT历史回复信息")
	}
}

// TestEmptyComments 测试无评论场景
func TestEmptyComments(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := []model.CommentDetail{} // 空评论列表

	template := NewDiscussionPromptTemplate(discussion, allComments, nil)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证无评论提示
	if !strings.Contains(prompt, "暂无评论") {
		t.Error("提示词应显示暂无评论")
	}

	if !strings.Contains(prompt, "暂无新评论") {
		t.Error("提示词应显示暂无新评论")
	}
}

// TestResolvedDiscussion 测试已解决帖子场景
func TestResolvedDiscussion(t *testing.T) {
	discussion := createTestDiscussion()
	discussion.Resolved = true // 标记为已解决

	allComments := createTestComments()
	newComment := &allComments[2]

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证已解决状态
	if !strings.Contains(prompt, "已解决") {
		t.Error("提示词应显示帖子已解决状态")
	}

	if !strings.Contains(prompt, "讨论已解决，可以确认解决方案") {
		t.Error("提示词应包含已解决帖子的回复策略")
	}
}

// TestNoKnowledgeDocuments 测试无知识文档场景
func TestNoKnowledgeDocuments(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[2]

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证无知识文档提示
	if !strings.Contains(prompt, "暂无相关知识库文档") {
		t.Error("提示词应显示暂无知识库文档")
	}
}

// TestDirectReplyToPost 测试直接回复主帖场景
func TestDirectReplyToPost(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()

	// 创建直接回复主帖的评论
	directReply := &model.CommentDetail{
		Comment: model.Comment{
			Base:         model.Base{ID: 3001, CreatedAt: model.Timestamp(time.Now().Unix())},
			DiscussionID: 1001,
			ParentID:     0, // 直接回复主帖
			UserID:       104,
			Content:      "我也遇到了类似问题，期待解决方案",
			Bot:          false,
		},
		UserName: "新用户小明",
	}

	template := NewDiscussionPromptTemplate(discussion, allComments, directReply)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证直接回复主帖的策略
	if !strings.Contains(prompt, "这是对主帖的直接回复") {
		t.Error("提示词应识别这是对主帖的直接回复")
	}

	if !strings.Contains(prompt, "新评论是对主帖的直接回复") {
		t.Error("提示词应包含主帖回复的策略指导")
	}
}

// TestComplexCommentTree 测试复杂评论树结构
func TestComplexCommentTree(t *testing.T) {
	discussion := createTestDiscussion()
	now := time.Now().Unix()

	// 创建复杂的评论树结构
	allComments := []model.CommentDetail{
		// 根评论1
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2001, CreatedAt: model.Timestamp(now)},
				DiscussionID: 1001,
				ParentID:     0,
				Content:      "建议使用Redis集群",
				Bot:          false,
			},
			UserName: "用户A",
		},
		// 根评论1的子评论
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2002, CreatedAt: model.Timestamp(now + 60)},
				DiscussionID: 1001,
				ParentID:     2001,
				Content:      "集群方案的详细配置...",
				Bot:          true,
			},
			UserName: "智能助手",
		},
		// 根评论2
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2003, CreatedAt: model.Timestamp(now + 120)},
				DiscussionID: 1001,
				ParentID:     0,
				Content:      "也可以考虑读写分离",
				Bot:          false,
			},
			UserName: "用户B",
		},
		// 根评论2的子评论
		{
			Comment: model.Comment{
				Base:         model.Base{ID: 2004, CreatedAt: model.Timestamp(now + 180)},
				DiscussionID: 1001,
				ParentID:     2003,
				Content:      "读写分离确实有效，具体实现建议...",
				Bot:          true,
			},
			UserName: "智能助手",
		},
	}

	newComment := &allComments[2] // 用户B的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)
	commentTree := template.buildCommentTree()

	// 验证评论树结构
	if len(commentTree) != 2 {
		t.Errorf("期望2个根评论，实际得到%d个", len(commentTree))
	}

	// 验证第一个根评论的子评论
	if len(commentTree[0].Children) != 1 {
		t.Errorf("期望第一个根评论有1个子评论，实际有%d个", len(commentTree[0].Children))
	}

	// 验证第二个根评论的子评论
	if len(commentTree[1].Children) != 1 {
		t.Errorf("期望第二个根评论有1个子评论，实际有%d个", len(commentTree[1].Children))
	}

	// 验证新评论标记
	secondRoot := commentTree[1]
	if !secondRoot.IsNew {
		t.Error("第二个根评论应该被标记为新评论")
	}
}

// TestBotHistoryExtraction 测试BOT历史回复提取
func TestBotHistoryExtraction(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[2] // 非BOT评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)
	template.ExtractBotReplies()

	// 验证BOT历史回复数量
	if len(template.BotHistoryReplies) != 1 {
		t.Errorf("期望1个BOT历史回复，实际得到%d个", len(template.BotHistoryReplies))
	}

	// 验证BOT回复内容
	botReply := template.BotHistoryReplies[0]
	if botReply.ID != 2002 {
		t.Errorf("期望BOT回复ID为2002，实际为%d", botReply.ID)
	}

	if !botReply.Bot {
		t.Error("提取的回复应该标记为BOT回复")
	}
}

// TestTemplateFunctions 测试模版函数
func TestTemplateFunctions(t *testing.T) {
	template := &DiscussionPromptTemplate{}

	// 测试formatTime函数
	timestamp := model.Timestamp(1640995200) // 2022-01-01 00:00:00 UTC
	formatted := template.formatTime(timestamp)
	if !strings.Contains(formatted, "2022-01-01") {
		t.Errorf("时间格式化错误，期望包含2022-01-01，实际为%s", formatted)
	}

	// 测试findCommentByID函数
	comments := createTestComments()
	foundComment := template.findCommentByID(comments, 2002)
	if foundComment == nil {
		t.Error("应该能找到ID为2002的评论")
	}
	if foundComment != nil && foundComment.ID != 2002 {
		t.Errorf("找到的评论ID错误，期望2002，实际%d", foundComment.ID)
	}

	// 测试找不到评论的情况
	notFound := template.findCommentByID(comments, 9999)
	if notFound != nil {
		t.Error("不应该找到不存在的评论")
	}

	// 测试isReplyToBot函数
	botReplies := []model.CommentDetail{comments[1]} // BOT回复
	isReply := template.isReplyToBot(botReplies, 2002)
	if !isReply {
		t.Error("应该检测到这是对BOT回复的响应")
	}

	notReply := template.isReplyToBot(botReplies, 2001)
	if notReply {
		t.Error("不应该检测到这是对BOT回复的响应")
	}
}

// TestRenderComment 测试评论渲染
func TestRenderComment(t *testing.T) {
	discussion := createTestDiscussion()
	allComments := createTestComments()

	template := NewDiscussionPromptTemplate(discussion, allComments, &allComments[2])
	commentTree := template.buildCommentTree()

	// 测试渲染根评论
	rootNode := commentTree[0]
	rendered := template.renderComment(rootNode, "")

	// 验证渲染结果包含关键信息
	if !strings.Contains(rendered, "[ID: 2001]") {
		t.Error("渲染结果应包含评论ID")
	}

	if !strings.Contains(rendered, "用户张工") {
		t.Error("渲染结果应包含用户名")
	}

	if !strings.Contains(rendered, "可以考虑Redis集群方案") {
		t.Error("渲染结果应包含评论内容")
	}

	// 验证BOT回复标记
	if !strings.Contains(rendered, "【BOT回复】") {
		t.Error("渲染结果应包含BOT回复标记")
	}

	// 验证新评论标记
	if !strings.Contains(rendered, "【NEW】") {
		t.Error("渲染结果应包含新评论标记")
	}
}

// TestFullPromptWithAllFeatures 测试包含所有特性的完整提示词
func TestFullPromptWithAllFeatures(t *testing.T) {
	discussion := createTestDiscussion()
	discussion.Tags = []string{"Redis", "缓存", "性能优化", "高并发"}

	allComments := createTestComments()
	newComment := &allComments[3] // 对BOT回复的评论

	template := NewDiscussionPromptTemplate(discussion, allComments, newComment)

	prompt, err := template.BuildPrompt()
	if err != nil {
		t.Fatalf("生成提示词失败: %v", err)
	}

	// 验证所有主要组件都存在
	expectedSections := []string{
		"# 论坛智能助手",
		"## 系统角色定义",
		"## 当前帖子信息",
		"## 评论楼层结构",
		"## 上下文分析",
		"## 相关知识库文档",
		"## 回复要求",
		"## 回复质量标准",
		"## 特殊情况处理",
		"请基于以上信息生成你的回复内容：",
	}

	for _, section := range expectedSections {
		if !strings.Contains(prompt, section) {
			t.Errorf("提示词应包含章节: %s", section)
		}
	}

	// 验证具体内容
	if !strings.Contains(prompt, "Redis, 缓存, 性能优化, 高并发") {
		t.Error("提示词应包含所有标签")
	}

	if !strings.Contains(prompt, "感谢智能助手的回复") {
		t.Error("提示词应包含新评论内容")
	}

	// 打印完整提示词用于手动验证（可选）
	t.Logf("完整提示词:\n%s", prompt)
}

// BenchmarkPromptGeneration 性能基准测试
func BenchmarkPromptGeneration(b *testing.B) {
	discussion := createTestDiscussion()
	allComments := createTestComments()
	newComment := &allComments[2]

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		template := NewDiscussionPromptTemplate(discussion, allComments, newComment)
		_, err := template.BuildPrompt()
		if err != nil {
			b.Fatalf("生成提示词失败: %v", err)
		}
	}
}

// TestTemplateInitialization 测试模版初始化
func TestTemplateInitialization(t *testing.T) {
	template := &DiscussionPromptTemplate{}

	err := template.initTemplate()
	if err != nil {
		t.Fatalf("模版初始化失败: %v", err)
	}

	if template.template == nil {
		t.Error("模版初始化后应该不为nil")
	}
}
