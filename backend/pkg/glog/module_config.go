package glog

import (
	"bufio"
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"os"
	"strings"
	"sync"
	"time"
)

var fileHash string

func configCheckLoop(path string) {
	With("path", path).Debug("check config ticker begin")

	if path == "" {
		return
	}

	configCheck(path)

	go func() {
		for {
			time.Sleep(time.Second * 10)
			configCheck(path)
		}
	}()
}

func configCheck(path string) {
	fi, err := os.Stat(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			With("error", err).With("path", path).Error("get file stat failed")
		} else if globalModuleConfig.hash != "" {
			globalModuleConfig = &moduleConfig{
				hash:    "",
				module:  make(map[string]*module),
				modTime: time.Unix(0, 0),
			}
		}
		return
	}

	if !fi.Mode().IsRegular() {
		if globalModuleConfig.hash != "" {
			globalModuleConfig = &moduleConfig{
				hash:    "",
				module:  make(map[string]*module),
				modTime: time.Unix(0, 0),
			}
		}
		return
	}

	parseConfig(path, fi.ModTime())
}

type module struct {
	propogate bool
	level     level
	submodule map[string]*module
}

type moduleConfig struct {
	hash        string
	modTime     time.Time
	module      map[string]*module
	moduleCache sync.Map
}

var globalModuleConfig = &moduleConfig{
	hash:    "",
	module:  make(map[string]*module),
	modTime: time.Unix(0, 0),
}

// format: api.pkg: debug
func parseConfig(path string, modTime time.Time) {
	if !modTime.After(globalModuleConfig.modTime) {
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		With("error", err).With("path", path).Error("read file failed")
		return
	}

	dataHash := hash(data)
	if globalModuleConfig.hash == dataHash {
		return
	}

	m := make(map[string]*module)
	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		text := strings.TrimSpace(scanner.Text())
		if text == "" {
			continue
		}

		propogate := true
		if text[0] == '!' {
			propogate = false
			text = string(text[1:])
		}

		splitLine := strings.Split(text, ":")
		var l level
		switch len(splitLine) {
		case 1:
			l = defaultLevel
		case 2:
			var ok bool
			l, ok = levelMap[strings.TrimSpace(splitLine[1])]
			if !ok {
				With("config_line", text).Warn("invalid log level, user default")
				l = defaultLevel
			}
		default:
			With("config_line", text).Warn("invalid format, skip")
			continue
		}

		splitModules := strings.Split(strings.TrimSpace(splitLine[0]), ".")
		var t *module
		for i, splitModule := range splitModules {
			var ok bool

			if i == 0 {
				t, ok = m[splitModule]
				if !ok || t == nil {
					t = &module{
						propogate: false,
						level:     LevelDiscard,
						submodule: make(map[string]*module),
					}
					m[splitModule] = t
				}
			} else {
				sub, ok := t.submodule[splitModule]
				if !ok || sub == nil {
					sub = &module{}
					t.submodule[splitModule] = sub
				}
				t = sub
			}
		}
		if t != nil {
			t.propogate = propogate
			t.level = l
		}
	}

	globalModuleConfig = &moduleConfig{
		hash:        dataHash,
		modTime:     modTime,
		module:      m,
		moduleCache: sync.Map{},
	}
}

func hash(data []byte) string {
	h := md5.New()
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

func getModuleLevel(modules []string, strModules string) level {
	mc := globalModuleConfig

	if len(mc.module) == 0 {
		return defaultLevel
	}

	if len(modules) == 0 {
		globModule, ok := mc.module["*"]
		if ok && globModule != nil {
			return globModule.level
		}
		return defaultLevel
	}

	cacheLevel, ok := mc.moduleCache.Load(strModules)
	if ok {
		return cacheLevel.(level)
	}
	l := LevelDiscard

	queue := make([]*module, 0)

	m, ok := mc.module["*"]
	if ok && m != nil {
		if len(modules) == 1 || m.propogate {
			l = m.level
		}
		queue = append(queue, m)
	}

	m, ok = mc.module[modules[0]]
	if ok && m != nil {
		if len(modules) == 1 || m.propogate {
			l = m.level
		}
		queue = append(queue, m)
	}

	for i := 1; i < len(modules); i++ {
		if len(queue) == 0 {
			break
		}

		last := i+1 == len(modules)

		newQueue := make([]*module, 0, len(queue)*2)

		for _, q := range queue {
			submodule, ok := q.submodule["*"]
			if ok && submodule != nil {
				if last || submodule.propogate {
					l = submodule.level
				}
				newQueue = append(newQueue, submodule)
			}

			submodule, ok = q.submodule[modules[i]]
			if ok && submodule != nil {
				if last || submodule.propogate {
					l = submodule.level
				}
				newQueue = append(newQueue, submodule)
			}
		}

		queue = newQueue
	}

	mc.moduleCache.Store(strModules, l)
	return l
}

var envTrace = os.Getenv("GLOG_PRINT_STACK") == "true"

func canOutput(modules []string, strModules string, l level) (bool, bool) {
	moduleLevel := getModuleLevel(modules, strModules)
	return envTrace || moduleLevel == LevelTrace, moduleLevel != LevelDiscard && l >= moduleLevel
}
