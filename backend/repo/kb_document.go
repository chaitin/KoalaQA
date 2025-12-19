package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
	"gorm.io/gorm/clause"
)

type KBDocument struct {
	base[*model.KBDocument]
}

func (d *KBDocument) GetByID(ctx context.Context, res any, kbID uint, docID uint, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)
	return d.model(ctx).Where("kb_id = ? and id = ?", kbID, docID).Scopes(o.Scopes()...).First(res).Error
}

func (d *KBDocument) GetByRagIDs(ctx context.Context, ids []string) ([]model.KBDocument, error) {
	var docs []model.KBDocument
	if err := d.model(ctx).
		Where("rag_id in (?)", ids).
		Find(&docs).Error; err != nil {
		return nil, err
	}
	docs = util.SortByKeys(docs, ids, func(doc model.KBDocument) string {
		return doc.RagID
	})
	return docs, nil
}

func (d *KBDocument) GetByTaskID(ctx context.Context, taskID string) (*model.KBDocument, error) {
	var doc model.KBDocument
	err := d.model(ctx).Where("export_task_id = ?", taskID).First(&doc).Error
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

func (d *KBDocument) CreateOnIDConflict(ctx context.Context, res *model.KBDocument) error {
	return d.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"export_task_id", "status", "message", "title", "desc", "export_opt"}),
	}).Create(res).Error
}

func (d *KBDocument) ListSpace(ctx context.Context, res any, kbID uint, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)

	return d.model(ctx).
		Select([]string{"kb_documents.*", "sub_doc.total", "sub_doc.success", "sub_doc.failed"}).
		Joins("LEFT JOIN (select parent_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = ?) AS success, COUNT(*) FILTER (WHERE status IN (?,?)) AS failed FROM kb_documents where kb_id = ? AND doc_type = ? AND parent_id != 0 GROUP BY parent_id) AS sub_doc ON sub_doc.parent_id = kb_documents.id", model.DocStatusApplySuccess, model.DocStatusExportFailed, model.DocStatusApplyFailed, kbID, model.DocTypeSpace).
		Where("kb_id = ?", kbID).
		Where("doc_type = ?", model.DocTypeSpace).
		Scopes(o.Scopes()...).
		Find(res).Error
}

func (d *KBDocument) BatchCreate(ctx context.Context, data *[]model.KBDocument) error {
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
