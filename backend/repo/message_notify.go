package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type MessageNotify struct {
	base[*model.MessageNotify]
}

func (mn *MessageNotify) BatchCreate(ctx context.Context, notifies ...model.MessageNotify) error {
	if len(notifies) == 0 {
		return nil
	}
	return mn.model(ctx).CreateInBatches(&notifies, 1000).Error
}

func newMessageNotify(db *database.DB) *MessageNotify {
	return &MessageNotify{
		base: base[*model.MessageNotify]{
			db: db, m: &model.MessageNotify{},
		},
	}
}

func init() {
	register(newMessageNotify)
}
