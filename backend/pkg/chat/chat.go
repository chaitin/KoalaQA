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
	mutex   sync.Mutex
	c       chan string
	stream  strings.Builder
	Visited bool
	Done    bool
}

func newSteamState() *streamState {
	return &streamState{
		mutex:   sync.Mutex{},
		c:       make(chan string, 8),
		stream:  strings.Builder{},
		Visited: false,
		Done:    false,
	}
}

func (s *streamState) Append(data string, done bool) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if data != "" {
		s.stream.WriteString(data)
		if s.Visited {
			select {
			case s.c <- data:
			default:
			}
		}
	}

	if done {
		s.Done = done
		close(s.c)
	}
}

func (s *streamState) Text(visited bool) string {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if visited {
		return <-s.c
	}

	return s.stream.String()
}

type StateManager struct {
	cache sync.Map
}

func (s *StateManager) Get(key string) (*streamState, bool) {
	val, ok := s.cache.Load(key)
	if !ok {
		return nil, false
	}

	return val.(*streamState), true
}

func (s *StateManager) Set(key string, state *streamState) {
	s.cache.Store(key, state)
}

func (s *StateManager) Delete(key string) {
	s.cache.Delete(key)
}

func newStateManager() *StateManager {
	return &StateManager{
		cache: sync.Map{},
	}
}

type Type uint

const (
	TypeUnknown Type = iota
	TypeDingtalk
	TypeWecom
	TypeWecomIntelligent
	TypeWecomService
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

func New(typ Type, cfg model.SystemChatConfig, callback BotCallback,
	accessAddrCallback model.AccessAddrCallback, stateManager *StateManager) (Bot, error) {
	switch typ {
	case TypeDingtalk:
		return newDingtalk(cfg, callback)
	case TypeWecom:
		return newWecom(cfg, callback)
	case TypeWecomIntelligent:
		return newWecomIntelligent(cfg, callback)
	case TypeWecomService:
		return newWecomService(cfg, callback, accessAddrCallback, stateManager)
	default:
		return nil, errors.ErrUnsupported
	}
}
