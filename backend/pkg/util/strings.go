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
