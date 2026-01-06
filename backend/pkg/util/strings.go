package util

import (
	"regexp"
)

var normalizeRe = regexp.MustCompile(`\s+`)

func NormalizeString(s string) string {
	return normalizeRe.ReplaceAllString(s, " ")
}

func TruncateString(s string, maxLength int) string {
	runes := []rune(s)
	if len(runes) <= maxLength {
		return s
	}
	return string(runes[:maxLength])
}

// 超长字母数字混合字符串正则 (连续1000+个字母数字字符，如 base64、hash 等)
var longAlphanumericRe = regexp.MustCompile(`[A-Za-z0-9+/=_-]{1000,}`)

// CleanContentForLLM 清理用户输入内容，移除超长的数字英文混合字符串
// maxLen: 最大返回长度，0 表示不限制
func CleanContentForLLM(content string, maxLen int) string {
	if content == "" {
		return content
	}

	// 移除超长的数字英文混合字符串
	content = longAlphanumericRe.ReplaceAllString(content, "[长字符串已省略]")

	// 最终长度限制
	if maxLen > 0 {
		runes := []rune(content)
		if len(runes) > maxLen {
			content = string(runes[:maxLen]) + "\n...[内容已截断]"
		}
	}

	return content
}
