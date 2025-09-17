package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type Auth struct {
	repoSys       *repo.System
	svcPublicAddr *PublicAddress
	authMgmt      *third_auth.Manager
	logger        *glog.Logger
}

type AuthInfo struct {
	Type model.AuthType `json:"type"`
	URL  string         `json:"url"`
}

func (l *Auth) Get(ctx context.Context) (*model.Auth, error) {
	var data model.Auth
	err := l.repoSys.GetValueByKey(ctx, &data, model.SystemKeyAuth)
	if err != nil {
		return nil, err
	}

	for i := range data.AuthInfos {
		data.AuthInfos[i].Config.Oauth.ClientSecret = ""
	}

	return &data, nil
}

type AuthFrontendGetAuth struct {
	Type       model.AuthType `json:"type"`
	ButtonDesc string         `json:"button_desc"`
}

type AuthFrontendGetRes struct {
	EnableRegister bool                  `json:"enable_register"`
	PublicAccess   bool                  `json:"public_access"`
	AuthTypes      []AuthFrontendGetAuth `json:"auth_types"`
}

func (l *Auth) FrontendGet(ctx context.Context) (*AuthFrontendGetRes, error) {
	var data model.Auth
	err := l.repoSys.GetValueByKey(ctx, &data, model.SystemKeyAuth)
	if err != nil {
		return nil, err
	}

	res := AuthFrontendGetRes{
		EnableRegister: data.EnableRegister,
		PublicAccess:   data.PublicAccess,
		AuthTypes:      make([]AuthFrontendGetAuth, 0),
	}

	for _, authInfo := range data.AuthInfos {
		res.AuthTypes = append(res.AuthTypes, AuthFrontendGetAuth{
			Type:       authInfo.Type,
			ButtonDesc: authInfo.ButtonDesc,
		})
	}

	return &res, nil
}

func (l *Auth) updateAuthMgmt(ctx context.Context, auth model.Auth, checkCfg bool) error {
	publicAddress, err := l.svcPublicAddr.Get(ctx)
	if err != nil {
		return err
	}

	for _, authInfo := range auth.AuthInfos {
		callbackAddress := ""

		switch authInfo.Type {
		case model.AuthTypeOIDC:
			callbackAddress = publicAddress.FullURL("/api/user/login/third/callback/oidc")
		default:
			continue
		}

		err = l.authMgmt.Update(authInfo.Type, third_auth.Config{
			Config:      authInfo.Config,
			CallbackURL: callbackAddress,
		}, checkCfg)
		if err != nil {
			l.logger.WithContext(ctx).WithErr(err).With("config", authInfo.Config).Warn("update auth mgnt failed")
			return err
		}
	}

	return nil
}

func (l *Auth) Update(ctx context.Context, req model.Auth) error {
	err := l.updateAuthMgmt(ctx, req, true)
	if err != nil {
		return err
	}

	err = l.repoSys.Create(ctx, &model.System[any]{
		Key:   model.SystemKeyAuth,
		Value: model.NewJSONBAny(req),
	})
	if err != nil {
		return err
	}
	return nil
}

func newAuth(lc fx.Lifecycle, sys *repo.System, authMgmt *third_auth.Manager, publicAddr *PublicAddress) *Auth {
	auth := &Auth{
		repoSys:       sys,
		svcPublicAddr: publicAddr,
		authMgmt:      authMgmt,
		logger:        glog.Module("svc", "auth"),
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var dbAuth model.Auth
			err := auth.repoSys.GetValueByKey(ctx, &dbAuth, model.SystemKeyAuth)
			if err != nil {
				return err
			}

			return auth.updateAuthMgmt(ctx, dbAuth, false)
		},
	})
	return auth
}

func init() {
	registerSvc(newAuth)
}
