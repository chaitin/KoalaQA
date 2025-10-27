package repo

import (
	"context"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/rag"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Forum struct {
	base[*model.Forum]
	lock sync.Mutex
	rag  rag.Service
}

func newForum(db *database.DB, rag rag.Service) *Forum {
	return &Forum{base: base[*model.Forum]{db: db, m: &model.Forum{}}, lock: sync.Mutex{}, rag: rag}
}

func init() {
	register(newForum)
}

func (f *Forum) GetFirstID(ctx context.Context) (uint, error) {
	var id uint
	if err := f.model(ctx).Order("id ASC").Pluck("id", &id).Error; err != nil {
		return 0, err
	}
	return id, nil
}

func (f *Forum) UpdateWithGroup(ctx context.Context, forums []model.ForumInfo) error {
	f.lock.Lock()
	defer f.lock.Unlock()

	return f.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ids model.Int64Array
		for _, forum := range forums {
			if forum.ID > 0 {
				ids = append(ids, int64(forum.ID))
			}
		}

		var exists []model.Forum
		if err := tx.Where("id = ANY(?)", ids).Find(&exists).Error; err != nil {
			return err
		}

		existsMap := make(map[uint]model.Forum)
		for _, forum := range exists {
			existsMap[forum.ID] = forum
		}

		delIds := make([]uint, 0)
		if err := tx.Model(f.m).Scopes(func(d *gorm.DB) *gorm.DB {
			if len(ids) == 0 {
				return d.Where("true")
			}
			return d.Where("id != ALL(?)", ids)
		}).Pluck("id", &delIds).Error; err != nil {
			return err
		}

		if len(delIds) > 0 {
			var discussions []model.Discussion
			if err := tx.Model(&model.Discussion{}).Where("forum_id IN (?)", delIds).Find(&discussions).Error; err != nil {
				return err
			}
			if err := tx.Model(&model.Discussion{}).Where("forum_id IN (?)", delIds).Delete(nil).Error; err != nil {
				return err
			}
			for _, delId := range delIds {
				var forum model.Forum
				if err := tx.Where("id = ?", delId).First(&forum).Error; err != nil {
					return err
				}
				if err := f.rag.DeleteDataset(ctx, forum.DatasetID); err != nil {
					return err
				}
			}
			if err := tx.Model(f.m).Where("id IN (?)", delIds).Delete(nil).Error; err != nil {
				return err
			}
		}

		var data []model.Forum
		for _, forum := range forums {
			datasetID := existsMap[forum.ID].DatasetID
			if datasetID == "" {
				id, err := f.rag.CreateDataset(ctx)
				if err != nil {
					return err
				}
				datasetID = id
			}
			data = append(data, model.Forum{
				Base: model.Base{
					ID: forum.ID,
				},
				Name:      forum.Name,
				RouteName: forum.RouteName,
				Index:     forum.Index,
				GroupIDs:  model.Int64Array(forum.GroupIDs),
				DatasetID: datasetID,
			})
		}

		err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "route_name", "index", "group_ids", "dataset_id"}),
		}).CreateInBatches(data, 1000).Error
		if err != nil {
			return err
		}

		return nil
	})
}
