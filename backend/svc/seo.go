package svc

import (
	"context"
	"errors"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/repo"
)

type SEO struct {
	repoSys  *repo.System
	cacheSEO *model.SystemSEO
	lock     sync.Mutex
}

func (s *SEO) Get(ctx context.Context) (*model.SystemSEO, error) {
	if s.cacheSEO != nil {
		return s.cacheSEO, nil
	}

	s.lock.Lock()
	defer s.lock.Unlock()

	if s.cacheSEO != nil {
		return s.cacheSEO, nil
	}

	var seo model.SystemSEO
	err := s.repoSys.GetValueByKey(ctx, &seo, model.SystemKeySEO)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			s.cacheSEO = &model.SystemSEO{}
			return &model.SystemSEO{}, nil
		}

		return nil, err
	}

	s.cacheSEO = &seo

	return &seo, nil
}

func (s *SEO) Update(ctx context.Context, seo model.SystemSEO) error {
	s.lock.Lock()
	defer s.lock.Unlock()

	err := s.repoSys.Upsert(ctx, &model.System[any]{
		Key:   model.SystemKeySEO,
		Value: model.NewJSONBAny(seo),
	})
	if err != nil {
		return err
	}

	s.cacheSEO = &seo

	return nil
}

func newSEO(sys *repo.System) *SEO {
	return &SEO{
		repoSys: sys,
		lock:    sync.Mutex{},
	}
}

func init() {
	registerSvc(newSEO)
}
