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
	return d.model(ctx).Where("kb_id = ? and id = ?", kbID, docID).Scopes(o.Scopes()...).First(res).Error
}

func (d *KBDocument) GetByRagIDs(ctx context.Context, res any, ids []string) error {
	return d.model(ctx).
		Where("rag_id in (?)", ids).
		Order("id desc").
		Find(res).Error
}

func (d *KBDocument) CreateOnIDConflict(ctx context.Context, res any) error {
	return d.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"title", "desc", "markdown", "json"}),
	}).Create(res).Error
}

func (d *KBDocument) ListSpace(ctx context.Context, res any, kbID uint, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)

	return d.model(ctx).
		Joins("LEFT JOIN (select parent_id, COUNT(*) AS total FROM kb_documents where doc_type = ? AND parent_id != 0 GROUP BY parent_id) AS sub_doc ON sub_doc.parent_id = kb_documents.id", model.DocTypeSpace).
		Where("kb_id = ?", kbID).
		Where("doc_type = ?", model.DocTypeSpace).
		Scopes(o.Scopes()...).
		Find(res).Error
}

func (d *KBDocument) BatchCreate(ctx context.Context, data []model.KBDocument) error {
	return d.model(ctx).CreateInBatches(&data, 1000).Error
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
