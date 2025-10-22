package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Dataset struct {
	backendID  string
	frontendID string
	base[*model.Dataset]
}

func newDataset(db *database.DB) *Dataset {
	return &Dataset{
		base: base[*model.Dataset]{
			db: db, m: &model.Dataset{},
		},
	}
}

func init() {
	register(newDataset)
}

func (d *Dataset) SetID(name string, id string) {
	switch name {
	case model.DatasetBackend:
		d.backendID = id
	case model.DatasetFrontend:
		d.frontendID = id
	}
}

func (d *Dataset) GetBackendID(ctx context.Context) string {
	return d.backendID
}
