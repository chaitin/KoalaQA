package repo

import (
	"context"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Group struct {
	lock sync.Mutex
	base[*model.Group]
}

func (g *Group) ListWithItem(ctx context.Context, forumID uint, res any) error {
	var gids model.Int64Array
	if forumID > 0 {
		var forum *model.Forum
		if err := g.db.Model(&model.Forum{}).Where("id = ?", forumID).First(&forum).Error; err != nil {
			return err
		}
		gids = forum.GroupIDs
	}
	scope := func(d *gorm.DB) *gorm.DB {
		if len(gids) > 0 {
			return d.Where("groups.id = ANY(?)", gids)
		}
		return d
	}

	return g.model(ctx).
		Scopes(scope).
		Select([]string{
			"groups.*",
			"item.items",
		}).
		Joins("LEFT JOIN (SELECT group_id, jsonb_agg(jsonb_build_object('id', id, 'name', name, 'index', index) ORDER BY index ASC) as items from group_items group by group_id) as item ON item.group_id = groups.id").
		Order("index ASC").
		Find(res).Error
}

func (g *Group) UpdateWithItem(ctx context.Context, groups []model.GroupWithItem) error {
	g.lock.Lock()
	defer g.lock.Unlock()

	return g.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var (
			groupIDs     model.Int64Array
			groupItemIDs model.Int64Array

			updateGroups     = make([]model.Group, 0)
			updateGroupItems = make([]model.GroupItem, 0)
		)

		for _, group := range groups {
			if group.ID > 0 {
				groupIDs = append(groupIDs, int64(group.ID))
			}

			updateGroups = append(updateGroups, model.Group{
				Base: model.Base{
					ID: group.ID,
				},
				Name:  group.Name,
				Index: group.Index,
			})
		}

		err := tx.Model(g.m).Scopes(func(d *gorm.DB) *gorm.DB {
			if len(groupIDs) == 0 {
				return d.Where("true")
			}

			return d.Where("id != ANY(?)", groupIDs)
		}).Delete(nil).Error
		if err != nil {
			return err
		}

		err = tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "index", "updated_at"}),
		}).CreateInBatches(&updateGroups, 1000).Error
		if err != nil {
			return err
		}

		for i, group := range groups {
			if group.ID == 0 {
				group.ID = updateGroups[i].ID
			}

			for _, item := range group.Items.Inner() {
				if item.ID > 0 {
					groupItemIDs = append(groupItemIDs, int64(item.ID))
				}

				updateGroupItems = append(updateGroupItems, model.GroupItem{
					Base: model.Base{
						ID: item.ID,
					},
					GroupID: group.ID,
					Index:   item.Index,
					Name:    item.Name,
				})
			}
		}

		err = tx.Model(&model.GroupItem{}).Scopes(func(d *gorm.DB) *gorm.DB {
			if len(groupItemIDs) == 0 {
				return d.Where("true")
			}

			return d.Where("id != ANY(?)", groupItemIDs)
		}).Delete(nil).Error
		if err != nil {
			return err
		}

		err = tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "group_id", "index", "updated_at"}),
		}).CreateInBatches(&updateGroupItems, 1000).Error
		if err != nil {
			return err
		}

		return nil
	})
}

func newGroup(db *database.DB) *Group {
	return &Group{
		base: base[*model.Group]{
			db: db, m: &model.Group{},
		},
	}
}

func init() {
	register(newGroup)
}
