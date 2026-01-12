package third_auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	"golang.org/x/oauth2"
)

type dingtalk struct {
	logger *glog.Logger

	cfg         model.AuthConfigOauth
	callbackURL model.AccessAddrCallback
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

func (d *dingtalk) getUserIDByUnionID(ctx context.Context, unionid string) (string, error) {
	tokenQuery := make(url.Values)
	tokenQuery.Set("appkey", d.cfg.ClientID)
	tokenQuery.Set("appsecret", d.cfg.ClientSecret)

	tokenReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://oapi.dingtalk.com/gettoken?"+tokenQuery.Encode(), nil)
	if err != nil {
		return "", err
	}

	tokenResp, err := util.HTTPClient.Do(tokenReq)
	if err != nil {
		return "", err
	}
	defer tokenResp.Body.Close()

	if tokenResp.StatusCode != http.StatusOK {
		d.logger.WithContext(ctx).With("body", d.body(ctx, tokenResp)).Error("get token failed")
		return "", fmt.Errorf("unexpected token status code: %d", tokenResp.StatusCode)
	}

	var tokenData struct {
		Errcode     int    `json:"errcode"`
		AccessToken string `json:"access_token"`
		Errmsg      string `json:"errmsg"`
		ExpiresIn   int    `json:"expires_in"`
	}
	err = json.NewDecoder(tokenResp.Body).Decode(&tokenData)
	if err != nil {
		return "", err
	}

	if tokenData.Errcode != 0 {
		return "", fmt.Errorf("get token failed:(%d) %s", tokenData.Errcode, tokenData.Errmsg)
	}

	reqBytes, err := json.Marshal(map[string]string{
		"unionid": unionid,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token="+tokenData.AccessToken, bytes.NewReader(reqBytes))
	if err != nil {
		return "", err
	}

	resp, err := util.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		d.logger.WithContext(ctx).With("body", d.body(ctx, resp)).Error("get user_id failed")
		return "", fmt.Errorf("unexpected user_id status code: %d", resp.StatusCode)
	}

	var resData struct {
		Errcode   int    `json:"errcode"`
		Errmsg    string `json:"errmsg"`
		RequestID string `json:"request_id"`
		Result    struct {
			ContactType int    `json:"contact_type"`
			UserID      string `json:"userid"`
		} `json:"result"`
	}
	err = json.NewDecoder(resp.Body).Decode(&resData)
	if err != nil {
		return "", err
	}

	if resData.Errcode != 0 {
		return "", fmt.Errorf("get user_id failed: %s (%d) %s", resData.RequestID, resData.Errcode, resData.Errmsg)
	}

	return resData.Result.UserID, nil
}

func (d *dingtalk) User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error) {
	opt := getUserOpt(optFuncs...)
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
		UnionID   string `json:"unionId"`
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

	var thirdID string
	switch opt.ThirdIDKey {
	case ThirdIDKeyOpenID:
		thirdID = userInfo.OpenID
	case ThirdIDKeyUnionID:
		thirdID = userInfo.UnionID
	case ThirdIDKeyUserID:
		thirdID, err = d.getUserIDByUnionID(ctx, userInfo.UnionID)
		if err != nil {
			return nil, err
		}
	default:
		thirdID = userInfo.OpenID
	}

	if thirdID == "" {
		return nil, errors.New("empty third_id")
	}

	return &User{
		ThirdID: thirdID,
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
