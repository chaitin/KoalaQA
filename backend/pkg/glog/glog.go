package glog

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Format uint

const (
	formatText = iota
	formatJson
)

func getFormatFromEnv() Format {
	switch strings.ToLower(os.Getenv("GLOG_FORMAT")) {
	case "json":
		return formatJson
	default:
		return formatText
	}
}

const defaultDirDepth = 4

func getDirDepth() int {
	envDirDepth := os.Getenv("GLOG_DIR_DEPTH")
	if envDirDepth == "" {
		return defaultDirDepth
	}

	dirDepth, err := strconv.Atoi(envDirDepth)
	if err != nil {
		return defaultDirDepth
	}

	return dirDepth
}

func getModuleConifgPath() string {
	path := os.Getenv("GLOG_MODULE_CONIFIG_PATH")
	if path != "" {
		return path
	}

	execPath, err := os.Executable()
	if err != nil {
		With("error", err).Warn("get wd failed, use default module config dir")
		return "/app/data/glog"
	}

	return filepath.Join(filepath.Dir(execPath), "data", "glog")
}
