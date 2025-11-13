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

	commMsg, err := g.in.Common.DiscussMessage(ctx, dissID, userID)
	if err != nil {
		return nil, err
	}

	logger.With("discuss_body", commMsg).Debug("generate discuss message")

	switch msgType {
	case TypeDislikeBotComment:
		return NewBotDislikeComment(*commMsg), nil
	case TypeBotUnknown:
		return NewBotUnknown(*commMsg), nil
	case TypeNewQA:
		return NewCreateQA(*commMsg), nil
	case TypeNewFeedback:
		return NewCreateFeedback(*commMsg), nil
	case TypeNewBlog:
		return NewCreateBlog(*commMsg), nil
	default:
		return nil, fmt.Errorf("action %d not support", msgType)
	}
}

func (g *Generator) Doc(ctx context.Context, msgType Type, kbID uint, docID uint) (Message, error) {
	logger := g.logger.WithContext(ctx)
	logger.Debug("get common doc webhook message")

	commMsg, err := g.in.Common.DocMessage(ctx, kbID, docID)
	if err != nil {
		return nil, err
	}
	logger.With("doc_body", commMsg).Debug("generate doc message")

	switch msgType {
	case TypeQANeedReview:
		return NewQANeedReview(*commMsg), nil
	default:
		return nil, fmt.Errorf("action %d not support", msgType)
	}
}

func (g *Generator) AIInsight(ctx context.Context, msgType Type) (Message, error) {
	address, err := g.in.Common.publicAddress(ctx, "/admin/dashboard")
	if err != nil {
		return nil, err
	}

	switch msgType {
	case TypeAIInsightKnowledgeGap:
		return NewAIInsightKnowledgeGap(address), nil
	default:
		return nil, fmt.Errorf("action %d not support", msgType)
	}
}
