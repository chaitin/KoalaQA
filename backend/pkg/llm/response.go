package llm

import (
	"encoding/json"
	"errors"
	"regexp"
	"strings"
)

// ChatResponse LLM 聊天响应结构
type ChatResponse struct {
	Matched bool     `json:"matched"`
	Answer  string   `json:"answer"`
	Sources []Source `json:"sources"`
	Reason  string   `json:"reason"`
}

// Source 引用来源
type Source struct {
	Title  string `json:"title"`
	Source string `json:"source"`
}

// ParseChatResponse 安全解析 LLM 返回的 JSON 响应
// 处理可能的格式问题：代码块包裹、前后缀文本等
func ParseChatResponse(raw string) (*ChatResponse, error) {
	raw = strings.TrimSpace(raw)

	// 尝试直接解析
	var resp ChatResponse
	if err := json.Unmarshal([]byte(raw), &resp); err == nil {
		return &resp, nil
	}

	// 尝试提取 JSON（处理代码块或前后缀）
	extracted := extractJSON(raw)
	if extracted != "" {
		if err := json.Unmarshal([]byte(extracted), &resp); err == nil {
			return &resp, nil
		}
	}

	// 解析失败，返回错误
	return nil, errors.New("JSON解析失败: " + truncate(raw, 200))
}

// extractJSON 从文本中提取 JSON 对象
func extractJSON(s string) string {
	// 移除 markdown 代码块
	codeBlockRe := regexp.MustCompile("(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```")
	if matches := codeBlockRe.FindStringSubmatch(s); len(matches) > 1 {
		return matches[1]
	}

	// 查找第一个 { 到最后一个 } 之间的内容
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start != -1 && end != -1 && end > start {
		return s[start : end+1]
	}

	return ""
}

// truncate 截断字符串
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
