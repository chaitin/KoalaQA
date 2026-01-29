package llm

import (
	"strings"
)

var NeedHumanPrompt = `
## 角色定义
你是一个专业的智能客服助手，专门分析用户输入并判断是否需要转接人工客服。

## 分析任务
根据输入内容分析给定的匹配内容是否需要人工介入

## 判断标准
- 用户是否明确要求转人工服务

## 输出要求
- 只输出一个 bool 值
- 需要人工介入：输出 true
- 不需要人工介入：输出 false
- 不要输出任何解释、分析过程或其他额外内容
`

// HumanAssistanceResponse 转人工时的标准回复文案
const HumanAssistanceResponse = "您好！如果您需要人工协助，请前往社区，发帖详细描述您的问题，我们的客服人员会尽快与您联系并提供帮助。感谢您的理解与配合！"

// 转人工关键词列表
var requestHumanKeywords = []string{
	"转人工",
	"人工客服",
	"联系客服",
	"人工服务",
	"转接人工",
	"找客服",
	"人工帮助",
	"人工协助",
	"客服人员",
	"转客服",
	"要人工",
	"需要人工",
	"人工介入",
	"真人客服",
	"客服电话",
}

// IsRequestHuman 通过关键词匹配快速检测用户是否要求转人工客服
// 使用关键词匹配避免额外的大模型调用，提高响应速度
func IsRequestHuman(question string) bool {
	// 转为小写进行匹配
	lowerQuestion := strings.ToLower(question)
	
	for _, keyword := range requestHumanKeywords {
		if strings.Contains(lowerQuestion, strings.ToLower(keyword)) {
			return true
		}
	}
	
	return false
}
