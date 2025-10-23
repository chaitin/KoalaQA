package svc

import (
	"bytes"
	"context"
	"errors"
	"mime"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
	"github.com/vincent-petithory/dataurl"
	"gorm.io/gorm"
)

type Brand struct {
	repoSys *repo.System
	oc      oss.Client
	logger  *glog.Logger
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

	brand, err := b.Get(ctx)
	if err != nil {
		return err
	}

	if req.Logo != "" {
		dataURL, err := dataurl.DecodeString(req.Logo)
		if err != nil {
			return err
		}

		exts, err := mime.ExtensionsByType(dataURL.ContentType())
		if err != nil {
			return err
		}

		ext := ".png"
		if len(exts) > 0 {
			ext = exts[len(ext)-1]
		}

		req.Logo, err = b.oc.Upload(ctx, "brand", bytes.NewReader(dataURL.Data),
			oss.WithExt(ext),
			oss.WithPublic(),
		)
		if err != nil {
			return err
		}

		if brand.Logo != "" {
			err = b.oc.Delete(ctx, util.TrimFistDir(brand.Logo))
			if err != nil {
				b.logger.WithContext(ctx).WithErr(err).With("logo", brand.Logo).Warn("remove oss logo failed")
			}
		}
	}

	err = b.repoSys.Create(ctx, &model.System[any]{
		Key:   model.SystemKeyBrand,
		Value: model.NewJSONBAny(req),
	})

	if err != nil {
		return err
	}

	return nil
}

func newBrand(sys *repo.System, oc oss.Client) *Brand {
	return &Brand{
		repoSys: sys,
		oc:      oc,
		logger:  glog.Module("svc", "brand"),
	}
}

func init() {
	registerSvc(newBrand)
}
