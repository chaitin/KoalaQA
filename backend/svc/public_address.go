package svc

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/repo"
)

type PublicAddress struct {
	repoSys *repo.System
}

func (p *PublicAddress) Get(ctx context.Context) (*model.PublicAddress, error) {
	var publicAddress model.PublicAddress
	err := p.repoSys.GetValueByKey(ctx, &publicAddress, model.SystemKeyPublicAddress)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return &model.PublicAddress{}, nil
		}

		return nil, err
	}

	return &publicAddress, nil
}

func (p *PublicAddress) Update(ctx context.Context, publicAddress model.PublicAddress) error {
	return p.repoSys.Create(ctx, &model.System[any]{
		Key:   model.SystemKeyPublicAddress,
		Value: model.NewJSONBAny(publicAddress),
	})
}

func newPublicAddress(sys *repo.System) *PublicAddress {
	return &PublicAddress{
		repoSys: sys,
	}
}

func init() {
	registerSvc(newPublicAddress)
}
