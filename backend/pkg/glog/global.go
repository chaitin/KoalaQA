package glog

import (
	"context"
	"log/slog"
	"os"
	"strconv"

	"github.com/chaitin/koalaqa/pkg/trace"
	"github.com/sirupsen/logrus"
)

var global *Logger

func Module(name ...string) *Logger {
	return global.Module(name...)
}

func Skip(i int) *Logger {
	return global.Skip(i)
}

func With(args ...any) *Logger {
	return global.cloneLogger().With(args...)
}

func WithErr(err error) *Logger {
	return global.cloneLogger().WithErr(err)
}

func WithContext(ctx context.Context) *Logger {
	return global.WithTraceID(trace.TraceID(ctx)...)
}

func WithTraceID(traceID ...string) *Logger {
	if len(traceID) == 0 {
		return global
	}

	return global.With("trace_id", traceID)
}

func Debug(msg string, args ...any) {
	global.Debug(msg, args...)
}

func Info(msg string, args ...any) {
	global.Info(msg, args...)
}

func Warn(msg string, args ...any) {
	global.Warn(msg, args...)
}

func Error(msg string, args ...any) {
	global.Error(msg, args...)
}

func Fatal(msg string, args ...any) {
	global.Fatal(msg, args...)
}

func init() {
	handlerOptions := &slog.HandlerOptions{
		// 如果直接使用默认的 AddSource，会导致获取的不对，需要自己实现
		AddSource: false,
		Level:     slog.LevelDebug,
	}
	var l *slog.Logger
	switch getFormatFromEnv() {
	case formatJson:
		l = slog.New(slog.NewJSONHandler(os.Stdout, handlerOptions))
	default:
		l = slog.New(slog.NewTextHandler(os.Stdout, handlerOptions))
	}
	global = &Logger{
		global: true,
		logger: l,
	}

	envDisableAutoCheck := os.Getenv("GLOG_DISABLE_AUTO_CHECK")
	disableAutoCheck := false
	if envDisableAutoCheck != "" {
		disableAutoCheck, _ = strconv.ParseBool(envDisableAutoCheck)
	}

	envGlobalLevel := os.Getenv("GLOG_GLOBAL_LEVEL")
	if envGlobalLevel != "" {
		l, ok := levelMap[envGlobalLevel]
		if ok {
			defaultLevel = l
		}
	}

	logrusLevel := logrus.InfoLevel
	switch defaultLevel {
	case LevelDebug:
		logrusLevel = logrus.DebugLevel
	case LevelInfo:
		logrusLevel = logrus.InfoLevel
	case LevelWarn:
		logrusLevel = logrus.WarnLevel
	case LevelError:
		logrusLevel = logrus.ErrorLevel
	case LevelDiscard:
		logrusLevel = logrus.PanicLevel
	}
	logrus.SetLevel(logrusLevel)

	if !disableAutoCheck {
		configCheckLoop(getModuleConifgPath())
	}
}
