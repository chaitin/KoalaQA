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
	ChatTypeWecom
)

type BotReq struct {
	SessionID string `json:"session_id"`
	Question  string `json:"question"`
}

type BotCallback func(ctx context.Context, req BotReq) (*llm.Stream[string], error)

type VerifySign struct {
	Signature string `form:"signature" binding:"required"`
	Timestamp string `form:"timestamp" binding:"required"`
	Nonce     string `form:"nonce" binding:"required"`
}

type VerifyReq struct {
	VerifySign

	Content    string
	OnlyVerify bool
}

type Bot interface {
	Start() error
	StreamText(context.Context, VerifyReq) (string, error)
	Stop()
}

func New(typ ChatType, cfg model.SystemChatConfig, callback BotCallback) (Bot, error) {
	switch typ {
	case ChatTypeDingtalk:
		return newDingtalk(cfg, callback)
	case ChatTypeWecom:
		return newWecom(cfg, callback)
	default:
		return nil, errors.ErrUnsupported
	}
}
