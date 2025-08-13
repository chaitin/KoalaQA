package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
)

type KnowledgeBase struct {
	base[*model.KnowledgeBase]
}

func (kb *KnowledgeBase) list(ctx context.Context, res any, scopes ...database.Scope) error {
	return kb.model(ctx).Scopes(scopes...).Find(res).Error
}

func (kb *KnowledgeBase) ListWithDocCount(ctx context.Context, res any) error {
	return kb.list(ctx, res, func(db *database.DB) *database.DB {
		return db.Select([]string{
			"knowledge_bases.*",
			"doc.qa_count as qa_count",
			"doc.doc_count as doc_count",
		}).
			Joins("LEFT JOIN (?) as doc ON doc.kb_id = knowledge_bases.id",
				kb.db.Model(&model.KBDocument{}).Select("kb_id, COUNT(*) FILTER (WHERE doc_type = ?) AS qa_count, COUNT(*) FILTER (WHERE doc_type = ?) AS doc_count", model.DocTypeQuestion, model.DocTypeDocument).Group("kb_id"),
			)
	})
}

func (kb *KnowledgeBase) DeleteByID(ctx context.Context, id uint) error {
	return kb.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(&model.KnowledgeBase{}).Where("id = ?", id).Delete(nil).Error
		if err != nil {
			return err
		}
		err = tx.Model(&model.KBDocument{}).Where("kb_id = ?", id).Delete(nil).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func newKnowledgeBase(db *database.DB) *KnowledgeBase {
	return &KnowledgeBase{
		base: base[*model.KnowledgeBase]{db: db, m: &model.KnowledgeBase{}},
	}
}

func init() {
	register(newKnowledgeBase)
}
