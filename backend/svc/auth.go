package svc

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/third_auth"
	"github.com/chaitin/koalaqa/repo"
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

type LoginMethodGetRes struct {
	EnableRegister bool             `json:"enable_register"`
	PublicAccess   bool             `json:"public_access"`
	AuthTypes      []model.AuthType `json:"auth_types"`
}

func (l *Auth) Get(ctx context.Context) (*LoginMethodGetRes, error) {
	var data model.Auth
	err := l.repoSys.GetValueByKey(ctx, &data, model.SystemKeyAuth)
	if err != nil {
		return nil, err
	}

	res := LoginMethodGetRes{
		EnableRegister: data.EnableRegister,
		PublicAccess:   data.PublicAccess,
		AuthTypes:      make([]model.AuthType, 0),
	}

	for _, authInfo := range data.AuthInfos {
		res.AuthTypes = append(res.AuthTypes, authInfo.Type)
	}

	return &res, nil
}

func (l *Auth) Update(ctx context.Context, req model.Auth) error {
	publicAddress, err := l.svcPublicAddr.Get(ctx)
	if err != nil {
		return err
	}

	for _, authInfo := range req.AuthInfos {
		if authInfo.Type == model.AuthTypePassword {
			continue
		}

		err = l.authMgmt.Update(authInfo.Type, third_auth.Config{
			Config:      authInfo.Config,
			CallbackURL: publicAddress.Address,
		})
		if err != nil {
			return err
		}
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

func newAuth(sys *repo.System, authMgmt *third_auth.Manager, publicAddr *PublicAddress) *Auth {
	return &Auth{
		repoSys:       sys,
		svcPublicAddr: publicAddr,
		authMgmt:      authMgmt,
	}
}

func init() {
	registerSvc(newAuth)
}
