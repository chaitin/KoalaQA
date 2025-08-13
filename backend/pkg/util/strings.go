package util

import "strings"

func NormalizeString(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\t", " ")
	for strings.Contains(s, "  ") {
		s = strings.ReplaceAll(s, "  ", " ")
	}
	s = strings.ReplaceAll(s, "\n ", "\n")
	s = strings.ReplaceAll(s, " \n", "\n")
	return s
}
