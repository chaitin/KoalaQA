package util

import (
	"path/filepath"
	"strings"
)

func TrimFirstDir(path string) string {
	if path == "" {
		return ""
	}

	split := strings.Split(path, string(filepath.Separator))
	if split[0] == "" {
		split = split[1:]
	}

	if len(split) < 2 {
		return path
	}

	return strings.Join(split[1:], string(filepath.Separator))
}

func FirstDir(path string) string {
	if path == "" {
		return ""
	}
	split := strings.Split(path, string(filepath.Separator))
	if split[0] == "" {
		split = split[1:]
	}

	if len(split) < 2 {
		return ""
	}

	return split[0]
}
