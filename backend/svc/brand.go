package svc

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
	"gorm.io/gorm"
)

type Brand struct {
	repoSys *repo.System
}

func (b *Brand) Get(ctx context.Context) (*model.SystemBrand, error) {
	var data model.SystemBrand

	err := b.repoSys.GetValueByKey(ctx, &data, model.SystemKeyBrand)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &model.SystemBrand{}, nil
		}

		return nil, err
	}

	return &data, nil
}

func (b *Brand) Update(ctx context.Context, req model.SystemBrand) error {
	if len(req.Logo) > 1<<21 {
		return errors.New("logo too large")
	}

	err := b.repoSys.Create(ctx, &model.System[any]{
		Key:   model.SystemKeyBrand,
		Value: model.NewJSONBAny(req),
	})

	if err != nil {
		return err
	}

	return nil
}

func newBrand(sys *repo.System) *Brand {
	return &Brand{
		repoSys: sys,
	}
}

func init() {
	registerSvc(newBrand)
}
