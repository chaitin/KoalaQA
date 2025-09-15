package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/pkg/webhook/message"
)

type dingtalk struct {
	logger *glog.Logger

	url      string
	sign     string
	msgTypes map[message.Type]bool
}

func newDingtalk(u string, sign string, msgTypes []message.Type) (Webhook, error) {
	_, err := util.ParseHTTP(u)
	if err != nil {
		return nil, err
	}

	t := make(map[message.Type]bool)

	for _, mt := range msgTypes {
		t[mt] = true
	}

	return &dingtalk{
		logger:   glog.Module("webhook", "dingtalk"),
		url:      u,
		sign:     sign,
		msgTypes: t,
	}, nil
}

type dingTalkSendReq struct {
	Msgtype  string      `json:"msgtype"`
	Markdown markdownReq `json:"markdown"`
}

type markdownReq struct {
	Title string `json:"title"`
	Text  string `json:"text"`
}

type responseMsg struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func (d *dingtalk) signQuery(q url.Values) url.Values {
	timestamp := time.Now().UnixMilli()
	strToHash := fmt.Sprintf("%d\n%s", timestamp, d.sign)
	hmac256 := hmac.New(sha256.New, []byte(d.sign))
	hmac256.Write([]byte(strToHash))
	data := hmac256.Sum(nil)

	q.Set("timestamp", strconv.FormatInt(timestamp, 10))
	q.Set("sign", base64.StdEncoding.EncodeToString(data))
	return q
}

func (d *dingtalk) Send(ctx context.Context, msg message.Message) error {
	if !d.msgTypes[msg.Type()] {
		d.logger.WithContext(ctx).With("msg_type", msg.Type()).Debug("msg_type not support,skip")
		return nil
	}

	if d.url == "" {
		return errors.New("empty url")
	}

	d.logger.WithContext(ctx).With("url", d.url).With("msg", msg).Debug("send dingtalk webhook")

	u, err := url.Parse(d.url)
	if err != nil {
		return err
	}

	u.RawQuery = d.signQuery(u.Query()).Encode()

	snedMsg, err := msg.Message(model.WebhookTypeDingtalk)
	if err != nil {
		return err
	}

	reqData := dingTalkSendReq{
		Msgtype: "markdown",
		Markdown: markdownReq{
			Title: msg.Title(),
			Text:  snedMsg,
		},
	}

	dataByes, err := json.Marshal(reqData)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), bytes.NewReader(dataByes))
	if err != nil {
		return err
	}

	req.Header.Add("Content-Type", "application/json")

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("dingtalk webhook status code: %d", resp.StatusCode)
	}

	var res responseMsg
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return err
	}

	if res.ErrCode != 0 {
		return fmt.Errorf("dingtalk webhook response code: %d, msg: %s", res.ErrCode, res.ErrMsg)
	}

	return nil
}
