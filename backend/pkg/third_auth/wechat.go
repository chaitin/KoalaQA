package third_auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
)

type wechat struct {
	logger      *glog.Logger
	cfg         model.AuthConfigOauth
	callbackURL CallbackURLFunc
}

func (w *wechat) Check(ctx context.Context) error {
	if w.callbackURL == nil {
		return errors.New("callback url func is nil")
	}

	if w.cfg.ClientID == "" {
		return errors.New("empty wechat client_id")
	}
	if w.cfg.ClientSecret == "" {
		return errors.New("empty wechat client_secret")
	}

	return nil
}

func (w *wechat) AuthURL(ctx context.Context, state string, optFuncs ...authURLOptFunc) (string, error) {
	opt := getAuthURLOpt(optFuncs...)

	if opt.CallbackPath == "" {
		opt.CallbackPath = "/api/user/login/third/callback/wechat"
	}

	callbackURL, err := w.callbackURL(ctx, opt.CallbackPath)
	if err != nil {
		return "", err
	}

	query := make(url.Values)
	query.Set("appid", w.cfg.ClientID)
	query.Set("redirect_uri", callbackURL)
	query.Set("response_type", "code")
	query.Set("scope", "snsapi_login")
	query.Set("state", state)

	u, err := url.Parse("https://open.weixin.qq.com/connect/qrconnect")
	if err != nil {
		return "", err
	}

	u.Fragment = "wechat_redirect"
	u.RawQuery = query.Encode()

	return u.String(), nil
}

func (w *wechat) User(ctx context.Context, code string) (*User, error) {
	logger := w.logger.WithContext(ctx).With("code", code)

	reqInfo, err := w.getUserReqInfo(ctx, code)
	if err != nil {
		logger.WithErr(err).Error("get wechat user req info failed")
		return nil, err
	}

	userInfo, err := w.getUserInfo(ctx, reqInfo)
	if err != nil {
		return nil, err
	}

	return &User{
		ThirdID: userInfo.OpenID,
		Name:    userInfo.Nickname,
		Type:    model.AuthTypeWechat,
		Role:    model.UserRoleUser,
		Email:   "",
		Mobile:  "",
		Avatar:  userInfo.Headimgurl,
	}, nil
}

type wechatRes struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func (w *wechatRes) Error() error {
	if w.ErrCode == 0 {
		return nil
	}

	return fmt.Errorf("wechat response error code: %d, msg: %s", w.ErrCode, w.ErrMsg)
}

type userReqInfo struct {
	AccessToken string `json:"access_token"`
	OpenID      string `json:"openid"`
}

type accessTokenRes struct {
	wechatRes
	userReqInfo

	Scope string `json:"scope"`
}

func (w *wechat) getUserReqInfo(ctx context.Context, code string) (*userReqInfo, error) {
	query := make(url.Values)
	query.Set("appid", w.cfg.ClientID)
	query.Set("secret", w.cfg.ClientSecret)
	query.Set("code", code)
	query.Set("grant_type", "authorization_code")

	reqURL := url.URL{
		Scheme:   "https",
		Host:     "api.weixin.qq.com",
		Path:     "/sns/oauth2/access_token",
		RawQuery: query.Encode(),
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL.String(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wechat response status code: %d", resp.StatusCode)
	}

	var res accessTokenRes
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return nil, err
	}

	err = res.Error()
	if err != nil {
		return nil, err
	}

	return &res.userReqInfo, nil
}

type userInfo struct {
	OpenID     string `json:"openid"`
	Nickname   string `json:"nickname"`
	Headimgurl string `json:"headimgurl"`
}

type userRes struct {
	wechatRes
	userInfo
}

func (w *wechat) getUserInfo(ctx context.Context, reqInfo *userReqInfo) (*userInfo, error) {
	query := url.Values{}
	query.Set("access_token", reqInfo.AccessToken)
	query.Set("openid", reqInfo.OpenID)
	reqURL := url.URL{
		Scheme:   "https",
		Host:     "api.weixin.qq.com",
		Path:     "/sns/userinfo",
		RawQuery: query.Encode(),
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL.String(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wechat get user info status code: %d", resp.StatusCode)
	}

	var res userRes
	err = json.NewDecoder(resp.Body).Decode(&res)
	if err != nil {
		return nil, err
	}

	err = res.Error()
	if err != nil {
		return nil, err
	}

	return &res.userInfo, nil
}

func newWechat(cfg Config) Author {
	return &wechat{
		logger:      glog.Module("third_auth", "wechat"),
		cfg:         cfg.Config.Oauth,
		callbackURL: cfg.CallbackURL,
	}
}
