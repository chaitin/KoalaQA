package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type GroupItem struct {
	base[*model.GroupItem]
}

func (g *GroupItem) FilterIDs(ctx context.Context, groupIDs *model.Int64Array) error {
	return g.model(ctx).Select("id").Where("id =ANY(?)", groupIDs).Scan(groupIDs).Error
}

func newGroupItem(db *database.DB) *GroupItem {
	return &GroupItem{
		base: base[*model.GroupItem]{
			db: db, m: &model.GroupItem{},
		},
	}
}

func init() {
	register(newGroupItem)
}
