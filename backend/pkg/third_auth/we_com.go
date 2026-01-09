package third_auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
)

type weCom struct {
	logger      *glog.Logger
	cfg         model.AuthConfigOauth
	callbackURL CallbackURLFunc
}

func (w *weCom) Check(ctx context.Context) error {
	if w.callbackURL == nil {
		return errors.New("callback url func is nil")
	}

	if w.cfg.ClientID == "" {
		return errors.New("empty we_com client_id")
	}
	if w.cfg.ClientSecret == "" {
		return errors.New("empty we_com client_secret")
	}
	if w.cfg.CorpID == "" {
		return errors.New("empty we_com corp_id")
	}

	return nil
}

func (w *weCom) AuthURL(ctx context.Context, state string, optFuncs ...authURLOptFunc) (string, error) {
	opt := getAuthURLOpt(optFuncs...)

	if opt.CallbackPath == "" {
		opt.CallbackPath = "/api/user/login/third/callback/we_com"
	}

	callbackURL, err := w.callbackURL(ctx, opt.CallbackPath)
	if err != nil {
		return "", err
	}

	query := make(url.Values)
	query.Set("appid", w.cfg.CorpID)
	query.Set("redirect_uri", callbackURL)
	query.Set("agentid", w.cfg.ClientID)
	query.Set("state", state)

	fragment := ""

	var rawURL string
	if opt.APP {
		rawURL = "https://open.weixin.qq.com/connect/oauth2/authorize"
		fragment = "wechat_redirect"

		query.Set("scope", "snsapi_privateinfo")
		query.Set("response_type", "code")
	} else {
		rawURL = "https://login.work.weixin.qq.com/wwlogin/sso/login"
		query.Set("login_type", "CorpApp")
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	u.Fragment = fragment
	u.RawQuery = query.Encode()

	return u.String(), nil
}

func (w *weCom) User(ctx context.Context, code string) (*User, error) {
	accessToken, err := w.GetToken(ctx)
	if err != nil {
		return nil, err
	}

	ticket, err := w.GetUserTicket(ctx, accessToken, code)
	if err != nil {
		return nil, err
	}
	if ticket.UserID == "" {
		return nil, errors.New("empty we_com user_id")
	}

	res := &User{
		ThirdID: ticket.UserID,
		Name:    ticket.UserID,
		Type:    model.AuthTypeWeCom,
		Role:    model.UserRoleUser,
	}

	if ticket.UserTicket != "" {
		user, err := w.GetUserInfo(ctx, accessToken, ticket.UserTicket)
		if err != nil {
			return nil, err
		}

		res.Email = user.Email
		res.Avatar = user.Avatar
		res.Mobile = user.Mobile
	}

	return res, nil
}

type weComError struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func (w *weComError) Error() error {
	if w.ErrCode == 0 {
		return nil
	}

	return fmt.Errorf("api res error code: %d msg: %s", w.ErrCode, w.ErrMsg)
}

type weComUserDetailRes struct {
	weComError

	weComUser
}

type weComUser struct {
	UserID  string `json:"userid"`
	Gender  string `json:"gender"`
	Avatar  string `json:"avatar"`
	QRCode  string `json:"qr_code"`
	Mobile  string `json:"mobile"`
	Email   string `json:"email"`
	BizMail string `json:"biz_mail"`
	Address string `json:"address"`
}

func (w *weCom) GetUserInfo(ctx context.Context, accessToken, ticket string) (*weComUser, error) {
	logger := w.logger.WithContext(ctx)
	userDetailURL := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=%s", accessToken)
	detailReq := map[string]string{
		"user_ticket": ticket,
	}
	detailReqBody, err := json.Marshal(detailReq)
	if err != nil {
		logger.WithErr(err).Warn("marshal user detail req body failed")
		return nil, err
	}

	detailResp, err := util.HTTPClient.Post(userDetailURL, "application/json", bytes.NewBuffer(detailReqBody))
	if err != nil {
		logger.WithErr(err).Warn("get user detail failed")
		return nil, err
	}
	defer detailResp.Body.Close()

	var detailRespData weComUserDetailRes
	if err := json.NewDecoder(detailResp.Body).Decode(&detailRespData); err != nil {
		logger.WithErr(err).Warn("unmarshal we_com user response failed")
		return nil, err
	}

	err = detailRespData.Error()
	if err != nil {
		logger.WithErr(err).Warn("we_com response error info")
		return nil, err
	}

	return &detailRespData.weComUser, nil
}

type weComUserTicketRes struct {
	weComError

	weComUserTicket
}

type weComUserTicket struct {
	UserID     string `json:"userid"`
	UserTicket string `json:"user_ticket"`
}

func (w *weCom) GetUserTicket(ctx context.Context, accessToken, code string) (*weComUserTicket, error) {
	userTicketURL := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=%s&code=%s", accessToken, code)
	logger := w.logger.WithContext(ctx)
	resp, err := util.HTTPClient.Get(userTicketURL)
	if err != nil {
		logger.WithErr(err).Warn("get user ticket failed")
		return nil, err
	}
	defer resp.Body.Close()

	var ticketResp weComUserTicketRes
	if err := json.NewDecoder(resp.Body).Decode(&ticketResp); err != nil {
		logger.WithErr(err).Warn("unmarshal user ticket response failed")
		return nil, err
	}

	err = ticketResp.Error()
	if err != nil {
		logger.WithErr(err).Warn("we_com response error info")
		return nil, err
	}

	return &ticketResp.weComUserTicket, nil
}

type weComTokenRes struct {
	weComError
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// GetToken 获取 suite_access_token
func (w *weCom) GetToken(ctx context.Context) (string, error) {
	logger := w.logger.WithContext(ctx)
	resp, err := util.HTTPClient.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", w.cfg.CorpID, w.cfg.ClientSecret))
	if err != nil {
		logger.WithErr(err).Warn("do we_com access_token req failed")
		return "", err
	}
	defer resp.Body.Close()

	var tokenResp weComTokenRes
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		logger.WithErr(err).Warn("parse we_com response failed")
		return "", err
	}

	err = tokenResp.Error()
	if err != nil {
		logger.WithErr(err).Warn("we_com response error info")
		return "", err
	}

	return tokenResp.AccessToken, nil
}

func newWeCom(cfg Config) Author {
	return &weCom{
		logger:      glog.Module("third_auth", "we_com"),
		cfg:         cfg.Config.Oauth,
		callbackURL: cfg.CallbackURL,
	}
}
