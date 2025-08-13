package util

import (
	"path/filepath"
	"strings"
)

func TrimFistDir(path string) string {
	if path == "" {
		return ""
	}

	split := strings.Split(path, string(filepath.Separator))

	if len(split) < 2 {
		return path
	}

	return strings.Join(split[1:], string(filepath.Separator))
}
