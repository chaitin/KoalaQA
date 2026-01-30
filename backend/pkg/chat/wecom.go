package chat

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/google/uuid"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
)

type wecomReq struct {
	ToUserName   string `xml:"ToUserName"`
	FromUserName string `xml:"FromUserName"`
	CreateTime   int64  `xml:"CreateTime"`
	MsgType      string `xml:"MsgType"`
	Content      string `xml:"Content"`
	MsgID        string `xml:"MsgId"`
}

type wecomRes struct {
	XMLName      xml.Name   `xml:"xml"`
	ToUserName   wecomCDATA `xml:"ToUserName"`
	FromUserName wecomCDATA `xml:"FromUserName"`
	CreateTime   int64      `xml:"CreateTime"`
	MsgType      wecomCDATA `xml:"MsgType"`
	Content      wecomCDATA `xml:"Content"`
}

type wecomCDATA struct {
	Value string `xml:",cdata"`
}

type wecomAccessToken struct {
	Errcode     int    `json:"errcode"`
	Errmsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type wecomUserInfo struct {
	Errcode    int    `json:"errcode"`
	Errmsg     string `json:"errmsg"`
	UserID     string `json:"userid"`
	Name       string `json:"name"`
	Department []int  `json:"department"`
	Mobile     string `json:"mobile"`
	Email      string `json:"email"`
	Status     int    `json:"status"`
}

type wecom struct {
	logger      *glog.Logger
	cfg         model.SystemChatConfig
	botCallback BotCallback

	tokenCache accessToken
}

func (w *wecom) getAccessToken() (string, error) {
	if w.tokenCache.expired() {
		_, err, _ := sf.Do("access_token_wecom", func() (interface{}, error) {
			resp, err := util.HTTPClient.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", w.cfg.CorpID, w.cfg.ClientSecret))
			if err != nil {
				return "", errors.New("get wechatapp accesstoken failed")
			}
			defer resp.Body.Close()

			var tokenResp wecomAccessToken // 获取到token消息

			if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
				return "", errors.New("json decode wechat resp failed")
			}

			if tokenResp.Errcode != 0 {
				return "", fmt.Errorf("get wechat access token failed, code: %d, msg: %s", tokenResp.Errcode, tokenResp.Errmsg)
			}

			w.tokenCache = accessToken{
				token:    tokenResp.AccessToken,
				expireAt: time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second),
			}
			return nil, nil
		})
		if err != nil {
			return "", err
		}
	}

	return w.tokenCache.token, nil
}

func (cfg *wecom) getUserInfo(username string) (*wecomUserInfo, error) {
	accessToken, err := cfg.getAccessToken()
	if err != nil {
		return nil, err
	}
	// 请求获取用户的内容
	resp, err := util.HTTPClient.Get(fmt.Sprintf(
		"https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=%s&userid=%s",
		accessToken, username))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var userInfo wecomUserInfo
	err = json.NewDecoder(resp.Body).Decode(&userInfo)
	if err != nil {
		return nil, err
	}

	if userInfo.Errcode != 0 {
		return nil, fmt.Errorf("get user info failed: %d, %s", userInfo.Errcode, userInfo.Errmsg)
	}

	return &userInfo, nil
}

func (w *wecom) verify(ctx context.Context, req VerifyReq) (string, error) {
	wx := wxbizmsgcrypt.NewWXBizMsgCrypt(w.cfg.Token, w.cfg.AESKey, w.cfg.CorpID, wxbizmsgcrypt.XmlType)

	decryptBytes, cryptErr := wx.VerifyURL(req.MsgSignature, req.Timestamp, req.Nonce, req.Content)
	if cryptErr != nil {
		err := fmt.Errorf("verify failed: code: %d, msg: %s", cryptErr.ErrCode, cryptErr.ErrMsg)
		w.logger.WithContext(ctx).WithErr(err).With("req", req).Error("verify failed")
		return "", err
	}

	return string(decryptBytes), nil
}

func (w *wecom) chat(ctx context.Context, logger *glog.Logger, question string, fromUser string) {
	// userInfo, err := w.getUserInfo(fromUser)
	// if err != nil {
	// 	logger.WithErr(err).Warn("get user info failed")
	// 	return
	// }

	err := w.chatText(ctx, question, fromUser)
	if err != nil {
		logger.WithErr(err).Warn("chat text failed")
		return
	}
}

func (w *wecom) chatText(ctx context.Context, question string, fromUser string) error {
	stream, err := w.botCallback(ctx, BotReq{
		Type:      TypeWecom,
		SessionID: uuid.NewString(),
		Question:  question,
	})
	if err != nil {
		return err
	}
	defer stream.Close()

	var builder strings.Builder
	for {
		content, _, ok := stream.Text(ctx)
		if !ok {
			break
		}

		if content == "" {
			continue
		}

		builder.WriteString(content)
		if builder.Len() > 2000 {
			err = w.sendTextRes(builder.String(), fromUser)
			if err != nil {
				return err
			}

			builder.Reset()
		}
	}

	if builder.Len() > 0 {
		err = w.sendTextRes(builder.String(), fromUser)
		if err != nil {
			return err
		}
	}

	return nil
}

func (w *wecom) sendTextRes(response string, touser string) error {
	accessToken, err := w.getAccessToken()
	if err != nil {
		return err
	}
	msgData := map[string]interface{}{
		"touser":  touser,
		"msgtype": "markdown",
		"agentid": w.cfg.ClientID,
		"markdown": map[string]string{
			"content": response,
		},
	}

	jsonData, err := json.Marshal(msgData)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", accessToken)
	resp, err := util.HTTPClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		Errcode int    `json:"errcode"`
		Errmsg  string `json:"errmsg"`
	}
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return err
	}
	if result.Errcode != 0 {
		return fmt.Errorf("wechat Api failed : %s (code: %d)", result.Errmsg, result.Errcode)
	}
	return nil
}

func (w *wecom) StreamText(ctx context.Context, req VerifyReq) (string, error) {
	if req.OnlyVerify {
		return w.verify(ctx, req)
	}

	logger := w.logger.WithContext(ctx).With("req", req)
	logger.Info("receive wecom stream text req")

	wx := wxbizmsgcrypt.NewWXBizMsgCrypt(w.cfg.Token, w.cfg.AESKey, w.cfg.CorpID, wxbizmsgcrypt.XmlType)
	decryptBytes, cryptErr := wx.DecryptMsg(req.MsgSignature, req.Timestamp, req.Nonce, []byte(req.Content))
	if cryptErr != nil {
		err := fmt.Errorf("decrypt msg failed: code: %d, msg: %s", cryptErr.ErrCode, cryptErr.ErrMsg)
		logger.WithErr(err).Error("decrypt msg failed")
		return "", err
	}

	var msg wecomReq
	err := xml.Unmarshal(decryptBytes, &msg)
	if err != nil {
		logger.WithErr(err).With("msg", string(decryptBytes)).Error("unmarshal msg failed")
		return "", err
	}
	logger = logger.With("msg", msg)
	if msg.MsgType != "text" {
		logger.Info("type is not text, skip")
		return "", nil
	}

	content, err := w.resMsg(wecomRes{
		ToUserName:   wecomCDATA{Value: msg.FromUserName},
		FromUserName: wecomCDATA{Value: msg.ToUserName},
		CreateTime:   msg.CreateTime,
		MsgType:      wecomCDATA{"text"},
		Content:      wecomCDATA{Value: "正在查找相关信息..."},
	})
	if err != nil {
		return "", err
	}

	go w.chat(context.Background(), logger, msg.Content, msg.FromUserName)

	return content, nil
}

func (w *wecom) resMsg(res wecomRes) (string, error) {
	resBytes, err := xml.Marshal(res)
	if err != nil {
		return "", err
	}

	wx := wxbizmsgcrypt.NewWXBizMsgCrypt(w.cfg.Token, w.cfg.AESKey, w.cfg.CorpID, wxbizmsgcrypt.XmlType)
	encryptMsg, cryptErr := wx.EncryptMsg(string(resBytes), "", "")
	if cryptErr != nil {
		return "", fmt.Errorf("encrypt msg failed: code: %d. msg: %s", cryptErr.ErrCode, cryptErr.ErrMsg)
	}

	return string(encryptMsg), nil
}

func (w *wecom) Start() error {
	return nil
}

func (w *wecom) Stop() {}

func newWecom(cfg model.SystemChatConfig, callback BotCallback) (Bot, error) {
	return &wecom{
		logger:      glog.Module("chat", "wecom"),
		cfg:         cfg,
		botCallback: callback,
	}, nil
}
