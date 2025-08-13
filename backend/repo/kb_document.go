package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type KBDocument struct {
	base[*model.KBDocument]
}

func (d *KBDocument) GetByID(ctx context.Context, res any, kbID uint, docID uint, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)
	return d.base.model(ctx).Where("kb_id = ? and id = ?", kbID, docID).Scopes(o.Scopes()...).First(res).Error
}

func (d *KBDocument) GetByRagIDs(ctx context.Context, res any, ids []string) error {
	return d.base.model(ctx).Where("rag_id in (?)", ids).Find(res).Error
}

func (d *KBDocument) CreateOnIDConflict(ctx context.Context, res any) error {
	return d.base.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"title", "desc", "markdown", "json"}),
	}).Create(res).Error
}

func newKBDocument(db *database.DB) *KBDocument {
	return &KBDocument{
		base: base[*model.KBDocument]{
			db: db, m: &model.KBDocument{},
		},
	}
}

func init() {
	register(newKBDocument)
}
