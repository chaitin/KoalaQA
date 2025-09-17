package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type Auth struct {
	repoSys       *repo.System
	svcPublicAddr *PublicAddress
	authMgmt      *third_auth.Manager
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

func (l *Auth) updateAuthMgmt(ctx context.Context, auth model.Auth) error {
	publicAddress, err := l.svcPublicAddr.Get(ctx)
	if err != nil {
		return err
	}

	if publicAddress.Address == "" {
		return nil
	}

	u, err := util.ParseHTTP(publicAddress.Address)
	if err != nil {
		return err
	}

	for _, authInfo := range auth.AuthInfos {
		if authInfo.Type == model.AuthTypePassword {
			continue
		}

		switch authInfo.Type {
		case model.AuthTypeOIDC:
			u.Path = "/api/user/login/third/callback/oidc"
		}

		err = l.authMgmt.Update(authInfo.Type, third_auth.Config{
			Config:      authInfo.Config,
			CallbackURL: u.String(),
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (l *Auth) Update(ctx context.Context, req model.Auth) error {
	err := l.updateAuthMgmt(ctx, req)
	if err != nil {
		return nil
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
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var dbAuth model.Auth
			err := auth.repoSys.GetValueByKey(ctx, &dbAuth, model.SystemKeyAuth)
			if err != nil {
				return err
			}

			return auth.updateAuthMgmt(ctx, dbAuth)
		},
	})
	return auth
}

func init() {
	registerSvc(newAuth)
}
