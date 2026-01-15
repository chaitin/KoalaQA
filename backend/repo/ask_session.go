package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type AskSession struct {
	base[*model.AskSession]
}

func (a *AskSession) ListSession(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return a.model(ctx).Select("DISTINCT ON (ask_sessions.uuid, ask_sessions.user_id) ask_sessions.*").
		Joins("LEFT JOIN users ON ask_sessions.user_id = users.id").
		Scopes(opt.Scopes()...).
		Find(res).Error
}

func (a *AskSession) CountSession(ctx context.Context, res *int64, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return a.model(ctx).Joins("LEFT JOIN users ON ask_sessions.user_id = users.id").
		Where(opt.Scopes()).Group("ask_sessions.uuid, ask_sessions.user_id").Count(res).Error
}

func (a *AskSession) Get(ctx context.Context, res any, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return a.model(ctx).Scopes(opt.Scopes()...).Find(res).Error
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
