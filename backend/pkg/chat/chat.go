package chat

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/llm"
)

type ChatType uint

const (
	ChatTypeUnknown ChatType = iota
	ChatTypeDingtalk
)

type BotReq struct {
	SessionID string `json:"session_id"`
	Question  string `json:"question"`
}

type BotCallback func(ctx context.Context, req BotReq) (*llm.Stream[llm.AskSessionStreamItem], error)

type Bot interface {
	Start() error
	Stop()
}

func New(typ ChatType, cfg model.SystemChatConfig, callback BotCallback, accessAddrCallback model.AccessAddrCallback) (Bot, error) {
	switch typ {
	case ChatTypeDingtalk:
		return newDingtalk(cfg, callback, accessAddrCallback)
	default:
		return nil, errors.ErrUnsupported
	}
}
