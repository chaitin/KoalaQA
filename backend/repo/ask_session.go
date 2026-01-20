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

	return a.db.WithContext(ctx).Table("(?) AS records", a.db.Model(a.m).
		Select("ask_sessions.*, COALESCE(users.name, '匿名游客') AS username, ROW_NUMBER() OVER (PARTITION BY ask_sessions.uuid, ask_sessions.user_id ORDER BY ask_sessions.created_at ASC) as rn").
		Joins("LEFT JOIN users ON ask_sessions.user_id = users.id").Where("bot = ?", false),
	).Where("rn = ?", 1).Scopes(opt.Scopes()...).Find(res).Error
}

func (a *AskSession) CountSession(ctx context.Context, res *int64, queryFuncs ...QueryOptFunc) error {
	opt := getQueryOpt(queryFuncs...)

	return a.db.WithContext(ctx).Table("(?) AS records", a.db.Model(a.m).
		Select("ask_sessions.*, users.name AS username, ROW_NUMBER() OVER (PARTITION BY ask_sessions.uuid, ask_sessions.user_id ORDER BY ask_sessions.created_at ASC) as rn").
		Joins("LEFT JOIN users ON ask_sessions.user_id = users.id").Where("bot = ?", false),
	).Where("rn = ?", 1).Scopes(opt.Scopes()...).Count(res).Error
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
