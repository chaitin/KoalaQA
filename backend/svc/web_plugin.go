package svc

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/repo"
	"gorm.io/gorm"
)

type WebPlugin struct {
	cache *model.SystemWebPlugin

	repoSys *repo.System
}

func (w *WebPlugin) CustomerServiceEnabled(ctx context.Context) (bool, error) {
	plugin, err := w.Get(ctx)
	if err != nil {
		return false, err
	}

	return plugin.Enabled, nil
}

func (w *WebPlugin) Get(ctx context.Context) (*model.SystemWebPlugin, error) {
	if w.cache != nil {
		return w.cache, nil
	}

	var data model.SystemWebPlugin
	err := w.repoSys.GetValueByKey(ctx, &data, model.SystemKeyWebPlugin)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			w.cache = &model.SystemWebPlugin{}
			return w.cache, nil
		}

		return nil, err
	}

	w.cache = &data

	return w.cache, nil
}

func (w *WebPlugin) Update(ctx context.Context, req model.SystemWebPlugin) error {
	err := w.repoSys.Upsert(ctx, &model.System[any]{
		Key:   model.SystemKeyWebPlugin,
		Value: model.NewJSONBAny(req),
	})
	if err != nil {
		return err
	}
	w.cache = &req

	return nil
}

func newWebPlugin(sys *repo.System) *WebPlugin {
	return &WebPlugin{
		repoSys: sys,
	}
}

func init() {
	registerSvc(newWebPlugin)
}
