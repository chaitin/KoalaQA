package chat

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/crypt"
	"github.com/chaitin/koalaqa/pkg/glog"
)

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

type wecom struct {
	logger      *glog.Logger
	cache       sync.Map
	cfg         model.SystemChatConfig
	botCallback BotCallback
}

func (w *wecom) verify(req VerifyReq) (string, error) {
	wx, _, err := crypt.NewWXBizJsonMsgCrypt(w.cfg.ClientID, w.cfg.ClientSecret, "")
	if err != nil {
		return "", err
	}
	code, str := wx.VerifyURL(req.Signature, req.Timestamp, req.Nonce, req.Content)
	err = crypt.WecomErrorByCode(code)
	if err != nil {
		return "", err
	}

	return str, nil
}

type userReq struct {
	Msgid    string `json:"msgid"`
	Aibotid  string `json:"aibotid"`
	Chattype string `json:"chattype"`
	From     struct {
		Userid string `json:"userid"`
	} `json:"from"`
	Msgtype string `json:"msgtype"`
	Text    struct {
		Content string `json:"content"`
	} `json:"text"`
	Stream struct {
		Id string `json:"id"`
	} `json:"stream"`
}

type userResp struct {
	Msgtype string      `json:"msgtype"`
	Stream  weComStream `json:"stream"`
}

type weComStream struct {
	Id      string `json:"id"`
	Finish  bool   `json:"finish"`
	Content string `json:"content"`
	MsgItem []struct {
		Msgtype string `json:"msgtype"`
		Image   struct {
			Base64 string `json:"base64"`
			Md5    string `json:"md5"`
		} `json:"image"`
	} `json:"msg_item"`
}

func (w *wecom) decryptUserReq(ctx context.Context, req VerifyReq) (*userReq, error) {
	wx, _, err := crypt.NewWXBizJsonMsgCrypt(
		w.cfg.ClientID,
		w.cfg.ClientSecret,
		"",
	)
	if err != nil {
		return nil, err
	}

	code, reqMsg := wx.DecryptMsg(req.Content, req.Signature, req.Timestamp, req.Nonce)
	err = crypt.WecomErrorByCode(code)
	if err != nil {
		return nil, err
	}
	logger := w.logger.WithContext(ctx).With("req", reqMsg)
	logger.Info("recv wecom req")
	var data userReq
	err = json.Unmarshal([]byte(reqMsg), &data)
	if err != nil {
		return nil, err
	}

	return &data, nil
}

func (w *wecom) EncryptUserRes(ctx context.Context, nonce string, data weComStream) (string, error) {
	wx, _, err := crypt.NewWXBizJsonMsgCrypt(
		w.cfg.ClientID,
		w.cfg.ClientSecret,
		"",
	)
	if err != nil {
		return "", err
	}

	respBytes, err := json.Marshal(userResp{
		Msgtype: "stream",
		Stream:  data,
	})
	if err != nil {
		return "", err
	}

	code, msg := wx.EncryptMsg(string(respBytes), nonce)
	err = crypt.WecomErrorByCode(code)
	if err != nil {
		return "", err
	}

	return msg, nil
}

func (w *wecom) StreamText(ctx context.Context, req VerifyReq) (string, error) {
	if req.OnlyVerify {
		return w.verify(req)
	}

	logger := w.logger.WithContext(ctx)

	decryptReq, err := w.decryptUserReq(ctx, req)
	if err != nil {
		logger.WithErr(err).Error("decrypt user req failed")
		return "", err
	}

	logger = logger.With("req", decryptReq)

	switch decryptReq.Msgtype {
	case "text":
		state := &streamState{
			question: decryptReq.Text.Content,
			mutex:    sync.Mutex{},
			stream:   strings.Builder{},
			Done:     true,
		}
		_, loaded := w.cache.LoadOrStore(decryptReq.Msgid, state)
		if !loaded {
			stream, err := w.botCallback(ctx, BotReq{
				SessionID: "wecom_" + decryptReq.Msgid,
				Question:  state.question,
			})
			if err != nil {
				logger.WithErr(err).Error("bot callback failed")
				state.Append("出错了，请稍后再试", true)
			} else {
				go func() {
					stream.Read(context.Background(), func(content string) {
						state.Append(content, false)
					})

					state.Append("", true)
				}()
			}
		}

		resp, err := w.EncryptUserRes(ctx, req.Nonce, weComStream{
			Id:      decryptReq.Msgid,
			Finish:  false,
			Content: "<think>正在查找相关信息...</think>",
		})
		if err != nil {
			logger.WithErr(err).Error("encrypt wecom user res failed")
			return "", err
		}

		return resp, nil
	case "stream":
		stateI, ok := w.cache.Load(decryptReq.Stream.Id)
		if !ok {
			logger.Warn("msg not exist")
			resp, err := w.EncryptUserRes(ctx, req.Nonce, weComStream{
				Id:      decryptReq.Stream.Id,
				Finish:  true,
				Content: "出错了，请稍后再试",
			})
			if err != nil {
				logger.WithErr(err).Warn("encrypt user res failed")
				return "", err
			}
			return resp, nil
		}

		state := stateI.(*streamState)
		content := state.Text()

		if content == "" {
			content = "<think>正在查找相关信息...</think>"
		}

		if state.Done {
			w.cache.Delete(decryptReq.Stream.Id)
		}

		resp, err := w.EncryptUserRes(ctx, req.Nonce, weComStream{
			Id:      decryptReq.Stream.Id,
			Finish:  state.Done,
			Content: content,
		})
		if err != nil {
			logger.WithErr(err).Error("encrypt user res failed")
			return "", err
		}
		return resp, nil
	}

	return "", errors.ErrUnsupported
}

func (w *wecom) Start() error {
	return nil
}

func (w *wecom) Stop() {}

func newWecom(cfg model.SystemChatConfig, callback BotCallback) (Bot, error) {
	return &wecom{
		logger:      glog.Module("chat", "wecom"),
		cache:       sync.Map{},
		cfg:         cfg,
		botCallback: callback,
	}, nil
}
