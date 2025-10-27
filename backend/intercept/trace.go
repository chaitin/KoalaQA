package intercept

import (
	"time"

	"github.com/chaitin/koalaqa/pkg/context"
	"github.com/chaitin/koalaqa/pkg/glog"
	koalaTrace "github.com/chaitin/koalaqa/pkg/trace"
)

type trace struct {
	logger *glog.Logger
}

func newTrace() Interceptor {
	return &trace{
		logger: glog.Module("intercept", "trace"),
	}
}

func (t *trace) Intercept(ctx *context.Context) {
	req := ctx.Context.Request

	ctx.Context.Request = req.WithContext(koalaTrace.Context(req.Context()))

	l := t.logger.WithContext(ctx).With("method", req.Method).With("path", req.URL.Path)
	start := time.Now()
	defer func() {
		duration := time.Since(start).Seconds()
		if duration > 1 {
			l.With("elapsed", duration).Warn("slow request")
		}
	}()

	ctx.Next()
}

func (t *trace) Priority() int {
	return -100
}

func init() {
	registerGlobal(newTrace)
}
