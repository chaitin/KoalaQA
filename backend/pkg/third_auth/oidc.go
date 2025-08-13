package third_auth

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/cache"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
	oidcAuth "github.com/coreos/go-oidc/v3/oidc"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
)

type oidc struct {
	cfg         model.AuthConfigOauth
	callbackURL string

	oauthCfg oauth2.Config

	logger   *glog.Logger
	provider *oidcAuth.Provider
	cache    cache.Cache[struct{}]
}

func (o *oidc) setup() error {
	_, err := util.ParseHTTP(o.cfg.URL)
	if err != nil {
		return err
	}

	callbakU, err := util.ParseHTTP(o.callbackURL)
	if err != nil {
		return err
	}
	callbakU.RawPath = "/api/user/login/oidc"
	callbakU.Fragment = ""
	callbakU.RawQuery = ""

	if o.cfg.ClientID == "" {
		return errors.New("empty oidc client_id")
	}
	if o.cfg.ClientSecret == "" {
		return errors.New("empty oidc client_secret")
	}

	o.provider, err = oidcAuth.NewProvider(context.Background(), o.cfg.URL)
	if err != nil {
		return err
	}

	if o.provider.Endpoint().AuthURL == "" {
		return errors.New("invalid oidc url")
	}

	o.oauthCfg = oauth2.Config{
		ClientID:     o.cfg.ClientID,
		ClientSecret: o.cfg.ClientSecret,
		Endpoint:     o.provider.Endpoint(),
		RedirectURL:  callbakU.String(),
		Scopes:       []string{oidcAuth.ScopeOpenID, "profile", "email"},
	}

	return nil
}

func (o *oidc) AuthURL(ctx context.Context) (string, error) {
	state := uuid.NewString()
	o.cache.Set(state, struct{}{})

	return o.oauthCfg.AuthCodeURL(state), nil
}

func (o *oidc) User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error) {
	opt := getUserOpt(optFuncs...)

	if opt.state == "" {
		return nil, errors.New("empty state")
	}

	_, ok := o.cache.Get(opt.state)
	if !ok {
		return nil, errors.New("invalid state")
	}

	token, err := o.oauthCfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("id_token not found")
	}

	o.logger.WithContext(ctx).With("id_token", rawIDToken).Debug("oidc id_token")
	idToken, err := o.provider.Verifier(&oidcAuth.Config{ClientID: o.cfg.ClientID}).Verify(ctx, rawIDToken)
	if err != nil {
		return nil, err
	}

	var claims struct {
		Name          string `json:"name"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}
	err = idToken.Claims(&claims)
	if err != nil {
		return nil, err
	}

	if claims.Name == "" {
		return nil, errors.New("oidc name not found")
	}

	if !claims.EmailVerified {
		return nil, errors.New("email not verified")
	}

	if claims.Email == "" {
		return nil, errors.New("oidc email not found")
	}

	return &User{
		ThirdID: idToken.Subject,
		Type:    model.AuthTypeOIDC,
		Name:    claims.Name,
		Email:   claims.Email,
		Role:    model.UserRoleUser,
	}, nil
}

func newOIDC(cfg Config) (Author, error) {
	o := oidc{
		logger:      glog.Module("third_auth", "oidc"),
		cfg:         cfg.Config.Oauth,
		callbackURL: cfg.CallbackURL,
		cache:       cache.New[struct{}](time.Minute * 10),
	}
	err := o.setup()
	if err != nil {
		return nil, err
	}

	return &o, nil
}
