package util

import (
	"errors"
	"os"
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

func FileExist(path string) (bool, error) {
	fi, err := os.Stat(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return false, nil
		}

		return false, err
	}

	return fi.Mode().IsRegular(), nil
}
