package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/util"
	"gorm.io/gorm"
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

func (d *KBDocument) GetSpaceDoc(ctx context.Context, kbID uint, rootParentID uint, docID string) (*model.KBDocument, error) {
	var doc model.KBDocument
	err := d.model(ctx).Where("doc_type = ? AND kb_id = ? AND root_parent_id = ? AND doc_id = ?", model.DocTypeSpace, kbID, rootParentID, docID).First(&doc).Error
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

func (d *KBDocument) CreateOnIDConflict(ctx context.Context, res *model.KBDocument) error {
	return d.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"export_task_id", "status", "message", "title", "desc", "export_opt", "parent_id"}),
	}).Create(res).Error
}

func (d *KBDocument) ListSpace(ctx context.Context, res any, kbID uint, filterFolder bool, optFuncs ...QueryOptFunc) error {
	o := getQueryOpt(optFuncs...)

	folderFilter := ""

	if filterFolder {
		folderFilter = " AND file_type != 16"
	}

	joinSql := fmt.Sprintf("LEFT JOIN (select root_parent_id, COUNT(*) FILTER (WHERE true%s) AS total, COUNT(*) FILTER (WHERE status = ?%[1]s) AS success, COUNT(*) FILTER (WHERE status IN (?,?)%[1]s) AS failed FROM kb_documents where kb_id = ? AND doc_type = ? AND root_parent_id != 0 GROUP BY root_parent_id) AS sub_doc ON sub_doc.root_parent_id = kb_documents.id", folderFilter)

	return d.model(ctx).
		Select([]string{"kb_documents.*", "sub_doc.total", "sub_doc.success", "sub_doc.failed"}).
		Joins(joinSql, model.DocStatusApplySuccess, model.DocStatusExportFailed, model.DocStatusApplyFailed, kbID, model.DocTypeSpace).
		Where("kb_id = ?", kbID).
		Where("doc_type = ?", model.DocTypeSpace).
		Scopes(o.Scopes()...).
		Find(res).Error
}

func (d *KBDocument) UpsertSpaceFolderTree(ctx context.Context, folder *model.KBDocument, tree *model.CreateSpaceFolderInfo) error {
	return d.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if folder.ID == 0 {
			err := tx.Create(folder).Error
			if err != nil {
				return err
			}
		} else {
			err := tx.Model(&model.KBDocument{}).Where("id = ?", folder.ID).Updates(map[string]any{
				"export_opt": folder.ExportOpt,
			}).Error
			if err != nil {
				return err
			}
		}

		parentIDM := map[string]uint{
			folder.DocID: folder.ID,
		}
		return tree.Range(folder.DocID, func(parentDocID string, csfi *model.CreateSpaceFolderInfo) error {
			csfi.DocID = strings.TrimSpace(csfi.DocID)
			if csfi.File || csfi.DocID == "" || csfi.DocID == folder.DocID {
				return nil
			}

			parentID, ok := parentIDM[parentDocID]
			if !ok {
				parentID = folder.ID
			}

			var dbSubFolder model.KBDocument
			err := tx.Model(&model.KBDocument{}).Select("id", "title", "parent_id").Where("parent_id = ? AND doc_id = ?", parentID, csfi.DocID).First(&dbSubFolder).Error
			if err != nil {
				if errors.Is(err, database.ErrRecordNotFound) {
					dbSubFolder = model.KBDocument{
						DocID:        csfi.DocID,
						KBID:         folder.KBID,
						Title:        csfi.Title,
						Platform:     folder.Platform,
						FileType:     model.FileTypeFolder,
						DocType:      model.DocTypeSpace,
						Status:       model.DocStatusApplySuccess,
						ParentID:     parentID,
						RootParentID: folder.ID,
					}
					err = tx.Create(&dbSubFolder).Error
					if err != nil {
						return err
					}
				} else {
					return err
				}
			} else if dbSubFolder.Title != csfi.Title || parentID != dbSubFolder.ParentID {
				err = tx.Model(&model.KBDocument{}).Where("id = ?", dbSubFolder.ID).Updates(map[string]any{
					"parent_id": parentID,
					"title":     csfi.Title,
				}).Error
				if err != nil {
					return err
				}
			}

			parentIDM[csfi.DocID] = dbSubFolder.ID
			return nil
		})
	})
}

func (d *KBDocument) UpdateSpaceFolderAll(ctx context.Context, folderID uint, statusFilter []model.DocStatus, docStatus model.DocStatus, msg string) error {
	sql := `WITH RECURSIVE all_folder_doc AS (
	SELECT id, parent_id FROM kb_documents WHERE parent_id = ?
	UNION ALL
	SELECT d.id, d.parent_id FROM kb_documents d JOIN all_folder_doc ad ON d.parent_id = ad.id)
	
UPDATE kb_documents SET status = ?, message = ? FROM all_folder_doc WHERE all_folder_doc.id = kb_documents.id AND kb_documents.doc_type = ?`
	params := []interface{}{
		folderID, docStatus, msg, model.DocTypeSpace,
	}

	if len(statusFilter) > 0 {
		sql += " AND kb_documents.status IN (?)"
		params = append(params, statusFilter)
	}

	return d.db.WithContext(ctx).Exec(sql, params...).Error
}

func (d *KBDocument) UpdateSpaceFolderGroupIDs(ctx context.Context, docIDs model.Int64Array, groupIDs model.Int64Array) error {
	sql := `WITH RECURSIVE all_folder_doc AS (
	SELECT id, parent_id FROM kb_documents WHERE id =ANY(?)
	UNION ALL
	SELECT d.id, d.parent_id FROM kb_documents d JOIN all_folder_doc ad ON d.parent_id = ad.id)
	
UPDATE kb_documents SET group_ids = ?, updated_at = now() FROM all_folder_doc WHERE all_folder_doc.id = kb_documents.id AND kb_documents.file_type != ?`

	return d.db.WithContext(ctx).Exec(sql, docIDs, groupIDs, model.FileTypeFolder).Error
}

func (d *KBDocument) ListSpaceFolderAll(ctx context.Context, rootParentID uint, folderID uint, statusFilter []model.DocStatus, shallow bool) (res []model.KBDocument, err error) {
	if shallow {
		err = d.List(ctx, &res,
			QueryWithEqual("root_parent_id", rootParentID),
			QueryWithEqual("parent_id", folderID),
			QueryWithEqual("(file_type = 16 OR status IN (?))", statusFilter, EqualOPRaw),
		)

		return
	}

	filter := ""
	params := []any{rootParentID, folderID}
	if len(statusFilter) > 0 {
		filter = " AND d.status IN (?)"
		params = append(params, statusFilter)
	}
	sql := fmt.Sprintf(`WITH RECURSIVE all_folder_doc AS (
	SELECT * FROM kb_documents d WHERE d.root_parent_id = ? AND d.parent_id = ?%s
	UNION ALL
	SELECT d.* FROM kb_documents d JOIN all_folder_doc ad ON d.parent_id = ad.id%[1]s)
	
SELECT DISTINCT * FROM all_folder_doc`, filter)

	err = d.db.WithContext(ctx).Raw(sql, params...).Scan(&res).Error

	return
}

func (d *KBDocument) ListSpaceFolderAllDoc(ctx context.Context, docIDs model.Int64Array) (res []model.KBDocument, err error) {
	sql := `WITH RECURSIVE all_folder_doc AS (
	SELECT * FROM kb_documents d WHERE id =ANY(?)
	UNION ALL
	SELECT d.* FROM kb_documents d JOIN all_folder_doc ad ON d.parent_id = ad.id)
	
SELECT DISTINCT * FROM all_folder_doc where file_type != ?`

	err = d.db.WithContext(ctx).Raw(sql, docIDs, model.FileTypeFolder).Scan(&res).Error
	return
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
