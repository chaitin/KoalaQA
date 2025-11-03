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
	"golang.org/x/oauth2"
)

type oidc struct {
	cfg         model.AuthConfigOauth
	callbackURL string

	logger *glog.Logger
	cache  cache.Cache[struct{}]
}

func (o *oidc) Check(ctx context.Context) error {
	ctx = context.WithValue(ctx, oauth2.HTTPClient, util.HTTPClient)

	_, err := util.ParseHTTP(o.cfg.URL)
	if err != nil {
		return err
	}

	_, err = util.ParseHTTP(o.callbackURL)
	if err != nil {
		return err
	}

	if o.cfg.ClientID == "" {
		return errors.New("empty oidc client_id")
	}
	if o.cfg.ClientSecret == "" {
		return errors.New("empty oidc client_secret")
	}

	provider, err := oidcAuth.NewProvider(ctx, o.cfg.URL)
	if err != nil {
		return err
	}

	if provider.Endpoint().AuthURL == "" {
		return errors.New("invalid oidc url")
	}

	return nil
}

func (o *oidc) AuthURL(ctx context.Context, state string) (string, error) {
	ctx = context.WithValue(ctx, oauth2.HTTPClient, util.HTTPClient)

	if o.callbackURL == "" {
		return "", errors.New("empty callback addr")
	}

	provider, err := oidcAuth.NewProvider(ctx, o.cfg.URL)
	if err != nil {
		return "", err
	}

	return (&oauth2.Config{
		ClientID:     o.cfg.ClientID,
		ClientSecret: o.cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  o.callbackURL,
		Scopes:       []string{oidcAuth.ScopeOpenID, "profile", "email"},
	}).AuthCodeURL(state), nil
}

func (o *oidc) User(ctx context.Context, code string, optFuncs ...userOptFunc) (*User, error) {
	ctx = context.WithValue(ctx, oauth2.HTTPClient, util.HTTPClient)

	provider, err := oidcAuth.NewProvider(ctx, o.cfg.URL)
	if err != nil {
		return nil, err
	}

	oauthCfg := oauth2.Config{
		ClientID:     o.cfg.ClientID,
		ClientSecret: o.cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  o.callbackURL,
		Scopes:       []string{oidcAuth.ScopeOpenID, "profile", "email"},
	}

	token, err := oauthCfg.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("id_token not found")
	}

	o.logger.WithContext(ctx).With("id_token", rawIDToken).Debug("oidc id_token")
	idToken, err := provider.Verifier(&oidcAuth.Config{ClientID: o.cfg.ClientID}).Verify(ctx, rawIDToken)
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
		claims.Email = ""
	}

	return &User{
		ThirdID: idToken.Subject,
		Type:    model.AuthTypeOIDC,
		Name:    claims.Name,
		Email:   claims.Email,
		Role:    model.UserRoleUser,
	}, nil
}

func newOIDC(cfg Config) Author {
	o := oidc{
		logger:      glog.Module("third_auth", "oidc"),
		cfg:         cfg.Config.Oauth,
		callbackURL: cfg.CallbackURL,
		cache:       cache.New[struct{}](time.Minute * 10),
	}

	return &o
}
