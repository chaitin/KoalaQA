package database

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	gormLogger "gorm.io/gorm/logger"
)

type logger struct {
	level  gormLogger.LogLevel
	logger *glog.Logger

	ignoreRecordNotFoundError bool
	slowThreshold             time.Duration
}

func (c *logger) LogMode(level gormLogger.LogLevel) gormLogger.Interface {
	newLogger := *c
	newLogger.level = level
	return &newLogger
}

func (c *logger) Info(ctx context.Context, msg string, data ...interface{}) {
	if c.level < gormLogger.Info {
		return
	}

	c.logger.WithContext(ctx).Info(msg, data...)
}

func (c *logger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if c.level < gormLogger.Warn {
		return
	}

	c.logger.WithContext(ctx).Warn(msg, data...)
}

func (c *logger) Error(ctx context.Context, msg string, data ...interface{}) {
	if c.level < gormLogger.Error {
		return
	}

	c.logger.WithContext(ctx).Error(msg, data...)
}

func (c *logger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	if c.level <= gormLogger.Silent {
		return
	}

	elapsed := time.Since(begin)
	switch {
	case err != nil && c.level >= gormLogger.Error && (!errors.Is(err, ErrRecordNotFound) || !c.ignoreRecordNotFoundError):
		sql, rows := fc()
		c.logger.WithContext(ctx).WithErr(err).With("elapsed", float64(elapsed.Nanoseconds())/1e6).With("rows", rows).With("sql", sql).Error("exec sql error")
	case elapsed > c.slowThreshold && c.slowThreshold != 0 && c.level >= gormLogger.Warn:
		sql, rows := fc()
		c.logger.WithContext(ctx).With("elapsed", float64(elapsed.Nanoseconds())/1e6).With("rows", rows).With("sql", sql).Warn("slow sql")
	case c.level == gormLogger.Info:
		sql, rows := fc()
		c.logger.WithContext(ctx).With("elapsed", float64(elapsed.Nanoseconds())/1e6).With("rows", rows).With("sql", sql).Info("exec sql")
	}
}

func newLogger() gormLogger.Interface {
	return &logger{
		level:                     gormLogger.Info,
		logger:                    glog.Module("database", "gorm").Skip(3),
		ignoreRecordNotFoundError: false,
		slowThreshold:             200 * time.Millisecond,
	}
}
