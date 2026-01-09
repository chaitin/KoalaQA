package third_auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"golang.org/x/oauth2"
)

type dingtalk struct {
	logger *glog.Logger

	cfg         model.AuthConfigOauth
	callbackURL CallbackURLFunc
}

func (d *dingtalk) Check(ctx context.Context) error {
	if d.callbackURL == nil {
		return errors.New("callback url func is nil")
	}

	if d.cfg.ClientID == "" {
		return errors.New("empty dingtalk client_id")
	}
	if d.cfg.ClientSecret == "" {
		return errors.New("empty dingtalk client_secret")
	}

	return nil
}

func (d *dingtalk) AuthURL(ctx context.Context, state string, optFuncs ...authURLOptFunc) (string, error) {
	opt := getAuthURLOpt(optFuncs...)

	if opt.CallbackPath == "" {
		opt.CallbackPath = "/api/user/login/third/callback/dingtalk"
	}

	callbackURL, err := d.callbackURL(ctx, opt.CallbackPath)
	if err != nil {
		return "", err
	}
	cfg := oauth2.Config{
		ClientID:     d.cfg.ClientID,
		ClientSecret: d.cfg.ClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL: "https://login.dingtalk.com/oauth2/auth",
		},
		RedirectURL: callbackURL,
		Scopes:      []string{"openid"},
	}

	return cfg.AuthCodeURL(state, oauth2.SetAuthURLParam("prompt", "consent")), nil
}

func (d *dingtalk) body(ctx context.Context, resp *http.Response) string {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		d.logger.WithContext(ctx).WithErr(err).Error("read body failed")
		return ""
	}
	return string(body)
}

func (d *dingtalk) User(ctx context.Context, code string) (*User, error) {
	byteAccessTokenData, err := json.Marshal(map[string]string{
		"clientId":     d.cfg.ClientID,
		"clientSecret": d.cfg.ClientSecret,
		"code":         code,
		"grantType":    "authorization_code",
	})
	if err != nil {
		return nil, err
	}

	accessTokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.dingtalk.com/v1.0/oauth2/userAccessToken", bytes.NewReader(byteAccessTokenData))
	if err != nil {
		return nil, err
	}
	accessTokenReq.Header.Set("Content-Type", "application/json")

	accessTokenResp, err := util.HTTPClient.Do(accessTokenReq)
	if err != nil {
		return nil, err
	}
	defer accessTokenResp.Body.Close()

	if accessTokenResp.StatusCode != http.StatusOK {
		d.logger.WithContext(ctx).With("body", d.body(ctx, accessTokenResp)).Error("get access token failed")
		return nil, fmt.Errorf("unexpected access token status code: %d", accessTokenResp.StatusCode)
	}

	var accessTokenData struct {
		AccessToken string `json:"accessToken"`
		CorpID      string `json:"corpId"`
	}
	err = json.NewDecoder(accessTokenResp.Body).Decode(&accessTokenData)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.dingtalk.com/v1.0/contact/users/me", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("x-acs-dingtalk-access-token", accessTokenData.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		d.logger.WithContext(ctx).With("body", d.body(ctx, resp)).Error("get user info status code not ok")
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var userInfo struct {
		Nick      string `json:"nick"`
		OpenID    string `json:"openId"`
		Mobile    string `json:"mobile"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatarUrl"`
		StateCode string `json:"stateCode"`
	}
	err = json.NewDecoder(resp.Body).Decode(&userInfo)
	if err != nil {
		return nil, err
	}

	return &User{
		ThirdID: userInfo.OpenID,
		Name:    userInfo.Nick,
		Type:    model.AuthTypeDingtalk,
		Role:    model.UserRoleUser,
		Email:   userInfo.Email,
		Mobile:  userInfo.Mobile,
		Avatar:  userInfo.AvatarURL,
	}, nil
}

func newDingtalk(cfg Config) Author {
	return &dingtalk{
		logger:      glog.Module("third_auth", "dingtalk"),
		cfg:         cfg.Config.Oauth,
		callbackURL: cfg.CallbackURL,
	}
}
