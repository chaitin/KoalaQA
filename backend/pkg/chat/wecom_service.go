package chat

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/assets"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
)

type wecomServiceStatus struct {
	ErrCode       int    `json:"errcode"`
	ErrMsg        string `json:"errmsg"`
	ServiceState  int    `json:"service_state"`
	ServiceUserId string `json:"servicer_userid"`
}

type wecomServiceReplyMsgUrl struct {
	Touser   string           `json:"touser,omitempty"`
	OpenKfid string           `json:"open_kfid,omitempty"`
	Msgid    string           `json:"msgid,omitempty"`
	Msgtype  string           `json:"msgtype,omitempty"`
	Link     wecomServiceLink `json:"link,omitempty"`
}

type wecomServiceLink struct {
	Title        string `json:"title,omitempty"`
	Desc         string `json:"desc,omitempty"`
	Url          string `json:"url,omitempty"`
	ThumbMediaID string `json:"thumb_media_id,omitempty"`
}

type wecomServiceUserAskMsg struct {
	ToUserName string `xml:"ToUserName"`
	CreateTime int64  `xml:"CreateTime"`
	MsgType    string `xml:"MsgType"`
	Event      string `xml:"Event"`
	Token      string `xml:"Token"`
	OpenKfId   string `xml:"OpenKfId"`
}

type wecomServiceMsgRet struct {
	Errcode    int               `json:"errcode"`
	Errmsg     string            `json:"errmsg"`
	NextCursor string            `json:"next_cursor"` // 游标
	MsgList    []wecomServiceMsg `json:"msg_list"`
	HasMore    int               `json:"has_more"`
}

type wecomServiceMsg struct {
	Msgid    string `json:"msgid"`
	SendTime int64  `json:"send_time"`
	Origin   int    `json:"origin"`
	Msgtype  string `json:"msgtype"`
	Event    struct {
		EventType      string `json:"event_type"`
		Scene          string `json:"scene"`
		OpenKfid       string `json:"open_kfid"`
		ExternalUserid string `json:"external_userid"`
		WelcomeCode    string `json:"welcome_code"`
	} `json:"event"`
	Text struct {
		Content string `json:"content"`
	} `json:"text"`
	OpenKfid       string `json:"open_kfid"`
	ExternalUserid string `json:"external_userid"`
}

type wecomServiceMsgReq struct {
	Cursor      string `json:"cursor"`
	Token       string `json:"token"`
	Limit       int    `json:"limit"`
	VoiceFormat int    `json:"voice_format"`
	OpenKfid    string `json:"open_kfid"`
}

type wecomServiceReplyMsgText struct {
	Content string `json:"content,omitempty"`
}

type wecomServiceReplyMsg struct {
	Touser   string                   `json:"touser,omitempty"`
	OpenKfid string                   `json:"open_kfid,omitempty"`
	Msgid    string                   `json:"msgid,omitempty"`
	Msgtype  string                   `json:"msgtype,omitempty"`
	Text     wecomServiceReplyMsgText `json:"text,omitempty"`
}

type wecomServiceMediaUploadResponse struct {
	ErrCode   int    `json:"errcode"`
	ErrMsg    string `json:"errmsg"`
	MediaType string `json:"type"`
	MediaID   string `json:"media_id"`
	CreatedAt string `json:"created_at"`
}

type wecomService struct {
	logger             *glog.Logger
	cfg                model.SystemChatConfig
	botCallback        BotCallback
	accessAddrCallback model.AccessAddrCallback
	enabledCallback    model.EnabledCallback

	cursor     sync.Map
	tokenCache token
	imageCache token
}

func (w *wecomService) getAccessToken() (string, error) {
	if w.tokenCache.expired() {
		_, err, _ := sf.Do("access_token_wecom_service", func() (interface{}, error) {
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

			w.tokenCache = token{
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

func (w *wecomService) verify(ctx context.Context, req VerifyReq) (string, error) {
	wx := wxbizmsgcrypt.NewWXBizMsgCrypt(w.cfg.Token, w.cfg.AESKey, w.cfg.CorpID, wxbizmsgcrypt.XmlType)

	decryptBytes, cryptErr := wx.VerifyURL(req.MsgSignature, req.Timestamp, req.Nonce, req.Content)
	if cryptErr != nil {
		err := fmt.Errorf("verify failed: code: %d, msg: %s", cryptErr.ErrCode, cryptErr.ErrMsg)
		w.logger.WithContext(ctx).WithErr(err).With("req", req).Error("verify failed")
		return "", err
	}

	return string(decryptBytes), nil
}

func (w *wecomService) StreamText(ctx context.Context, req VerifyReq) (string, error) {
	if req.OnlyVerify {
		return w.verify(ctx, req)
	}

	logger := w.logger.WithContext(ctx).With("req", req)
	logger.Info("receive wecom service stream text req")

	wx := wxbizmsgcrypt.NewWXBizMsgCrypt(w.cfg.Token, w.cfg.AESKey, w.cfg.CorpID, wxbizmsgcrypt.XmlType)
	decryptBytes, cryptErr := wx.DecryptMsg(req.MsgSignature, req.Timestamp, req.Nonce, []byte(req.Content))
	if cryptErr != nil {
		err := fmt.Errorf("decrypt msg failed: code: %d, msg: %s", cryptErr.ErrCode, cryptErr.ErrMsg)
		logger.WithErr(err).Error("decrypt msg failed")
		return "", err
	}

	var msg wecomServiceUserAskMsg
	err := xml.Unmarshal(decryptBytes, &msg)
	if err != nil {
		logger.WithErr(err).With("msg", string(decryptBytes)).Error("unmarshal msg failed")
		return "", err
	}
	logger = logger.With("msg", msg)

	go w.chat(context.Background(), logger, &msg)

	return "", nil
}

func (w *wecomService) getMsgs(accessToken string, msg *wecomServiceUserAskMsg) (*wecomServiceMsgRet, error) {
	// 拉取消息的路由
	var cursor string
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=%s", accessToken)
	val, ok := w.cursor.Load(msg.OpenKfId)
	if ok {
		cursor = val.(string)
	}

	jsonBody, err := json.Marshal(wecomServiceMsgReq{
		OpenKfid:    msg.OpenKfId,
		Token:       msg.Token,
		Limit:       1000,
		VoiceFormat: 0,
		Cursor:      cursor,
	})
	if err != nil {
		return nil, err
	}

	resp, err := util.HTTPClient.Post(url, "application/json", bytes.NewBuffer(jsonBody)) // 得到对应的回复
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var msgRet wecomServiceMsgRet
	err = json.NewDecoder(resp.Body).Decode(&msgRet)
	if err != nil {
		return nil, err
	}

	if msgRet.Errcode != 0 {
		return nil, fmt.Errorf("get service msgs failed, code: %d, msg: %s", msgRet.Errcode, msgRet.Errmsg)
	}

	if msgRet.NextCursor != "" {
		w.cursor.Store(msg.OpenKfId, msgRet.NextCursor)
	}

	return &msgRet, nil
}

func (w *wecomService) checkSessionState(extrenaluserid, kfId string) (int, error) {
	accessToken, err := w.getAccessToken()
	if err != nil {
		return 0, err
	}

	var statusrequest struct {
		OpenKfId       string `json:"open_kfid"`
		ExternalUserid string `json:"external_userid"`
	}
	statusrequest.OpenKfId = kfId
	statusrequest.ExternalUserid = extrenaluserid
	// 将请求体转换为JSON
	jsonBody, err := json.Marshal(statusrequest)
	if err != nil {
		return 0, err
	}
	// 获取状态信息
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/service_state/get?access_token=%s", accessToken)
	resp, err := util.HTTPClient.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var response wecomServiceStatus
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return 0, err
	}
	// 得到用户的状态
	if response.ErrCode != 0 {
		return 0, fmt.Errorf("get sessions state failed: code: %d, msg %s", response.ErrCode, response.ErrMsg)
	}
	return response.ServiceState, nil
}

func (w *wecomService) send(data []byte) error {
	accessToken, err := w.getAccessToken()
	if err != nil {
		return err
	}

	resp, err := util.HTTPClient.Post(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=%s", accessToken),
		"application/json", bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("post to wechatservice failed: %w", err)
	}
	defer resp.Body.Close()

	var res struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		MsgID   string `json:"msgid"`
	}

	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return err
	}

	if res.ErrCode != 0 {
		return fmt.Errorf("send to wecom failed, code: %d, msg: %s", res.ErrCode, res.ErrMsg)
	}

	return nil
}

func (w *wecomService) sendMsg(userID, openkfID, content string) error {
	dataBytes, err := json.Marshal(wecomServiceReplyMsg{
		Touser:   userID,
		OpenKfid: openkfID,
		Msgtype:  "text",
		Text: wecomServiceReplyMsgText{
			Content: content,
		},
	})
	if err != nil {
		return err
	}

	return w.send(dataBytes)
}

func (w *wecomService) chat(ctx context.Context, logger *glog.Logger, msg *wecomServiceUserAskMsg) {
	accessToken, err := w.getAccessToken()
	if err != nil {
		logger.WithErr(err).Warn("get access token failed")
		return
	}

	msgRet, err := w.getMsgs(accessToken, msg)
	if err != nil {
		logger.WithErr(err).Warn("get msgs failed")
		return
	}

	if len(msgRet.MsgList) == 0 {
		logger.Info("no message received, skip")
		return
	}

	lastMsg := msgRet.MsgList[len(msgRet.MsgList)-1]

	if lastMsg.Msgtype == "event" && lastMsg.Event.EventType == "enter_session" {
		logger.Info("user enter session, skip")
		return
	}

	state, err := w.checkSessionState(lastMsg.ExternalUserid, lastMsg.OpenKfid)
	if err != nil {
		logger.WithErr(err).Warn("check session state failed")
		return
	}

	if state > 2 {
		logger.Info("human state, skip")
		return
	}

	enabled, err := w.enabledCallback(ctx)
	if err != nil {
		logger.WithErr(err).Error("get customer-service failed")
		e := w.sendMsg(lastMsg.ExternalUserid, lastMsg.OpenKfid, "出错了，请稍后再试。")
		if e != nil {
			logger.WithErr(e).Error("sned msg to user failed")
		}
		return
	}

	if !enabled {
		logger.Info("customer-service is disabled, skip")
		err = w.sendMsg(lastMsg.ExternalUserid, lastMsg.OpenKfid, "在线支持未开启。")
		if err != nil {
			logger.WithErr(err).Error("send msg to user failed")
			return
		}
	}

	err = w.sendURL(ctx, lastMsg.ExternalUserid, lastMsg.OpenKfid, "", lastMsg.Text.Content)
	if err != nil {
		logger.WithErr(err).Warn("send url failed")
		return
	}
}

func (w *wecomService) uploadMediaToWechat(reader io.Reader, fileName string) (string, error) {
	if w.imageCache.expired() {
		_, err, _ := sf.Do("wecom_service_image", func() (interface{}, error) {
			accessToken, err := w.getAccessToken()
			if err != nil {
				return "", err
			}
			// 上传文件 req
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)

			part, err := writer.CreateFormFile("media", fileName)
			if err != nil {
				return "", err
			}

			// 将图片数据复制到表单中
			_, err = io.Copy(part, reader)
			if err != nil {
				return "", fmt.Errorf("copy image failed: %w", err)
			}

			if err := writer.Close(); err != nil {
				return "", err
			}

			url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=%s&type=image", accessToken)
			req, err := http.NewRequest(http.MethodPost, url, body)
			if err != nil {
				return "", err
			}
			req.Header.Set("Content-Type", writer.FormDataContentType())

			httpResp, err := util.HTTPClient.Do(req)
			if err != nil {
				return "", err
			}
			defer httpResp.Body.Close()

			var result wecomServiceMediaUploadResponse
			if err := json.NewDecoder(httpResp.Body).Decode(&result); err != nil {
				return "", err
			}

			if result.ErrCode != 0 {
				return "", fmt.Errorf("upload image failed: [%d] %s", result.ErrCode, result.ErrMsg)
			}

			w.imageCache = token{
				token:    result.MediaID,
				expireAt: time.Now().Add(time.Hour * 72),
			}

			return nil, nil
		})
		if err != nil {
			return "", err
		}
	}

	return w.imageCache.token, nil
}

func (w *wecomService) sendURL(ctx context.Context, userID, openkfID, sessionID, question string) error {
	val := make(url.Values)
	val.Set("question", question)
	val.Set("source", strconv.Itoa(int(model.AskSessionSourceWecomService)))
	if sessionID != "" {
		val.Set("id", sessionID)
	}
	fullPath, err := w.accessAddrCallback(ctx, "/customer-service")
	if err != nil {
		return err
	}

	imageID, err := w.uploadMediaToWechat(bytes.NewReader(assets.WecomService), "image.png")
	if err != nil {
		return err
	}

	dataBytes, err := json.Marshal(wecomServiceReplyMsgUrl{
		Touser:   userID,
		OpenKfid: openkfID,
		Msgtype:  "link",
		Link: wecomServiceLink{
			Url:          fullPath + "?" + val.Encode(),
			Desc:         "KoalaQA 在线支持",
			Title:        question,
			ThumbMediaID: imageID,
		},
	})

	return w.send(dataBytes)
}

func (w *wecomService) Start() error {
	return nil
}

func (w *wecomService) Stop() {}

func newWecomService(cfg model.SystemChatConfig, callback BotCallback,
	accessAddrCallback model.AccessAddrCallback, enabled model.EnabledCallback) (Bot, error) {
	return &wecomService{
		logger:             glog.Module("chat", "wecom_service"),
		cfg:                cfg,
		botCallback:        callback,
		enabledCallback:    enabled,
		accessAddrCallback: accessAddrCallback,
		cursor:             sync.Map{},
	}, nil
}
