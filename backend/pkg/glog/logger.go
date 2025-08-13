package glog

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/chaitin/koalaqa/pkg/trace"
)

type level uint

const (
	LevelTrace level = iota
	LevelDebug
	LevelInfo
	LevelWarn
	LevelError
	LevelDiscard
)

var (
	defaultLevel = LevelInfo

	levelMap = map[string]level{
		"trace":   LevelTrace,
		"debug":   LevelDebug,
		"info":    LevelInfo,
		"warn":    LevelWarn,
		"error":   LevelError,
		"discard": LevelDiscard,
	}

	slogLevelMap = map[level]slog.Level{
		LevelDebug: slog.LevelDebug,
		LevelInfo:  slog.LevelInfo,
		LevelWarn:  slog.LevelWarn,
		LevelError: slog.LevelError,
	}
)

type Logger struct {
	global     bool
	modules    []string
	strModules string
	skip       int

	logger *slog.Logger
}

func (l *Logger) Module(name ...string) *Logger {
	cloned := l.clone()

	for _, v := range name {
		cloned.modules = append(cloned.modules, strings.Split(strings.TrimSpace(v), ".")...)
	}

	cloned.strModules = strings.Join(cloned.modules, ".")
	return cloned
}

func (l *Logger) clone() *Logger {
	m := make([]string, len(l.modules))
	copy(m, l.modules)
	logger := *l.logger
	return &Logger{
		global:     false,
		skip:       l.skip,
		modules:    m,
		strModules: l.strModules,
		logger:     &logger,
	}
}

func (l *Logger) cloneLogger() *Logger {
	logger := *l.logger
	return &Logger{
		global:     false,
		skip:       l.skip,
		modules:    l.modules,
		strModules: l.strModules,
		logger:     &logger,
	}
}

func (l *Logger) Skip(i int) *Logger {
	if i < 0 {
		i = 0
	}

	t := l.cloneLogger()
	t.skip = i
	return t
}

func (l *Logger) With(args ...any) *Logger {
	t := *l
	t.logger = t.logger.With(args...)
	return &t
}

func (l *Logger) WithErr(err error) *Logger {
	return l.With("error", err)
}

func (l *Logger) WithContext(ctx context.Context) *Logger {
	return l.WithTraceID(trace.TraceID(ctx)...)
}

func (l *Logger) WithTraceID(traceID ...string) *Logger {
	if len(traceID) == 0 {
		return l
	}

	return l.With("trace_id", strings.Join(traceID, ","))
}

func (l *Logger) Debug(msg string, args ...any) {
	l.log(LevelDebug, msg, args...)
}

func (l *Logger) Info(msg string, args ...any) {
	l.log(LevelInfo, msg, args...)
}

func (l *Logger) Warn(msg string, args ...any) {
	l.log(LevelWarn, msg, args...)
}

func (l *Logger) Error(msg string, args ...any) {
	l.log(LevelError, msg, args...)
}

func (l *Logger) Fatal(msg string, args ...any) {
	l.log(LevelError, msg, args...)
	os.Exit(1)
}

func (l *Logger) log(lv level, msg string, args ...any) {
	stack, ok := canOutput(l.modules, l.strModules, lv)
	if !ok {
		return
	}

	l.withExtra(stack).logger.Log(context.Background(), slogLevelMap[lv], msg, args...)
}

var (
	dirDepth  = getDirDepth()
	separator = string(filepath.Separator)
)

const logSkipFrame = 4

func (l *Logger) skipFrame() int {
	if l.global {
		return logSkipFrame + l.skip + 1
	}

	return logSkipFrame + l.skip
}

func (l *Logger) withExtra(stack bool) *Logger {
	t := l.withModule().withSource()
	if stack {
		t = t.withStack()
	}

	return t
}

func (l *Logger) withStack() *Logger {
	var buf [2048]byte
	n := runtime.Stack(buf[:], false)

	return l.With("stack", string(buf[:n]))
}

func (l *Logger) withSource() *Logger {
	if dirDepth == 0 {
		return l
	}

	_, file, line, ok := runtime.Caller(l.skipFrame())
	if !ok {
		return l.With("source", "unknown")
	}

	if dirDepth > 0 {
		splitDir := strings.Split(file, separator)
		length := len(splitDir)
		if length > dirDepth {
			file = strings.Join(splitDir[length-dirDepth:length], separator)
		}
	}

	return l.With("source", &slog.Source{
		File: file,
		Line: line,
	})
}

func (l *Logger) withModule() *Logger {
	if l.strModules == "" {
		return l
	}
	return l.With("module", l.strModules)
}
