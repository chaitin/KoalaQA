package trace

import (
	"context"
	"strings"

	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/google/uuid"
)

type Key uint

const ctxKey Key = 1

func Context(ctx context.Context, traceID ...string) context.Context {
	v := ctx.Value(ctxKey)
	if v != nil {
		if len(traceID) == 0 {
			return ctx
		}

		arrV := v.([]string)

		arrV = append(arrV, traceID...)
		return context.WithValue(ctx, ctxKey, util.RemoveDuplicate(arrV))
	}

	if len(traceID) > 0 {
		return context.WithValue(ctx, ctxKey, util.RemoveDuplicate(traceID))
	}

	return context.WithValue(ctx, ctxKey, []string{uuid.NewString()})
}

func TraceID(ctx context.Context) []string {
	v := ctx.Value(ctxKey)
	if v == nil {
		return nil
	}

	return v.([]string)
}

func TraceIDString(ctx context.Context) string {
	return strings.Join(TraceID(ctx), ",")
}
