package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Webhook struct {
	base[*model.Webhook]
}

func newWebhook(db *database.DB) *Webhook {
	return &Webhook{
		base: base[*model.Webhook]{
			db: db, m: &model.Webhook{},
		},
	}
}

func init() {
	register(newWebhook)
}
