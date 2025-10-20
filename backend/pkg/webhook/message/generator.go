package message

import (
	"context"
	"fmt"

	"github.com/chaitin/koalaqa/pkg/glog"
	"go.uber.org/fx"
)

type generatorIn struct {
	fx.In

	Common *commonGetter
}

type Generator struct {
	in     generatorIn
	logger *glog.Logger
}

func NewGenerator(in generatorIn) *Generator {
	return &Generator{
		in:     in,
		logger: glog.Module("webhook", "message", "generator"),
	}
}

func (g *Generator) Discuss(ctx context.Context, msgType Type, dissID uint, userID uint) (Message, error) {
	logger := g.logger.WithContext(ctx)
	logger.Debug("get common webhook message")

	commMsg, err := g.in.Common.Message(ctx, dissID, userID)
	if err != nil {
		return nil, err
	}

	logger.With("discuss_body", commMsg).Debug("generate discuss message")

	switch msgType {
	case TypeDislikeBotComment:
		return NewBotDislikeComment(*commMsg), nil
	case TypeBotUnknown:
		return NewBotUnknown(*commMsg), nil
	default:
		return nil, fmt.Errorf("action %d not support", msgType)
	}
}
