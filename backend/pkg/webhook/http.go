package webhook

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
)

type httpHook struct {
	logger *glog.Logger

	url      string
	sign     string
	msgTypes map[message.Type]bool
}

func newHttpHook(u string, sign string, msgTypes []message.Type) (Webhook, error) {
	_, err := util.ParseHTTP(u)
	if err != nil {
		return nil, err
	}

	if sign == "" {
		return nil, errors.New("empty sign")
	}

	t := make(map[message.Type]bool)

	for _, mt := range msgTypes {
		t[mt] = true
	}

	return &httpHook{
		logger:   glog.Module("webhook", "http"),
		url:      u,
		sign:     sign,
		msgTypes: t,
	}, nil
}

func (h *httpHook) signBody(body []byte) string {
	return "sha256=" + hex.EncodeToString(util.HMACSha256(h.sign, string(body)))
}

func (h *httpHook) Send(ctx context.Context, msg message.Message) error {
	if !h.msgTypes[msg.Type()] {
		h.logger.WithContext(ctx).With("msg_type", msg.Type()).Debug("msg_type not support,skip")
		return nil
	}

	if h.url == "" {
		return errors.New("empty url")
	}

	h.logger.WithContext(ctx).With("url", h.url).With("msg", msg).Debug("send http webhook")

	byteData, err := json.Marshal(msg.Data())
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.url, bytes.NewReader(byteData))
	if err != nil {
		return err
	}

	req.Header.Add("Content-Type", "application/json")
	req.Header.Set("X-Koalaqa-Signature-256", h.signBody(byteData))

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	_, err = io.Copy(io.Discard, resp.Body)
	if err != nil {
		return nil
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("http webhook status code: %d", resp.StatusCode)
	}

	return nil
}
