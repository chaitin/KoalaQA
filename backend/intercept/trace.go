package intercept

import (
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
	l.Debug("receive request")

	ctx.Next()

	l.Debug("request finish")
}

func (t *trace) Priority() int {
	return -100
}

func init() {
	registerGlobal(newTrace)
}
