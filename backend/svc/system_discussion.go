package svc

import (
	"context"
	"errors"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/repo"
)

type SystemDiscussion struct {
	repoSys *repo.System
}

func newSystemDiscussion(sys *repo.System) *SystemDiscussion {
	return &SystemDiscussion{
		repoSys: sys,
	}
}

func (s *SystemDiscussion) Get(ctx context.Context) (*model.SystemDiscussion, error) {
	var disc model.SystemDiscussion
	err := s.repoSys.GetValueByKey(ctx, &disc, model.SystemKeyDiscussion)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return &model.SystemDiscussion{}, nil
		}

		return nil, err
	}

	return &disc, nil
}

func (s *SystemDiscussion) Update(ctx context.Context, req model.SystemDiscussion) error {
	return s.repoSys.Create(ctx, &model.System[any]{
		Key:   model.SystemKeyDiscussion,
		Value: model.NewJSONBAny(req),
	})
}

func init() {
	registerSvc(newSystemDiscussion)
}
