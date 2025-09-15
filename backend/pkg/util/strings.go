package util

import (
	"regexp"
)

var normalizeRe = regexp.MustCompile(`\s+`)

func NormalizeString(s string) string {
	return normalizeRe.ReplaceAllString(s, " ")
}
