package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type GroupItem struct {
	base[*model.GroupItem]
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
