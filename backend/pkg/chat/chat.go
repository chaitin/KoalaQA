package chat

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/llm"
	"golang.org/x/sync/singleflight"
)

var sf singleflight.Group

type accessToken struct {
	token    string
	expireAt time.Time
}

func (d *accessToken) expired() bool {
	return d.token == "" || time.Now().After(d.expireAt.Add(-time.Minute*5))
}

type streamState struct {
	mutex    sync.Mutex
	question string
	stream   strings.Builder
	Done     bool
}

func (s *streamState) Append(data string, done bool) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if data != "" {
		s.stream.WriteString(data)
	}

	if done {
		s.Done = done
	}
}

func (s *streamState) Text() string {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	return s.stream.String()
}

type Type uint

const (
	TypeUnknown Type = iota
	TypeDingtalk
	TypeWecom
	TypeWecomIntelligent
)

type BotReq struct {
	SessionID string `json:"session_id"`
	Question  string `json:"question"`
}

type BotCallback func(ctx context.Context, req BotReq) (*llm.Stream[string], error)

type VerifySign struct {
	MsgSignature string `form:"msg_signature" binding:"required"`
	Timestamp    string `form:"timestamp" binding:"required"`
	Nonce        string `form:"nonce" binding:"required"`
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

func New(typ Type, cfg model.SystemChatConfig, callback BotCallback) (Bot, error) {
	switch typ {
	case TypeDingtalk:
		return newDingtalk(cfg, callback)
	case TypeWecom:
		return newWecomIntelligent(cfg, callback)
	default:
		return nil, errors.ErrUnsupported
	}
}
