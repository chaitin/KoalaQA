package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type AskSession struct {
	base[*model.AskSession]
}

func newAskSession(db *database.DB) *AskSession {
	return &AskSession{
		base: base[*model.AskSession]{
			db: db, m: &model.AskSession{},
		},
	}
}

func init() {
	register(newAskSession)
}
