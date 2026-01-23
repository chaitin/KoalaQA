package repo

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm/clause"
)

type Bot struct {
	base[*model.Bot]
}

func (b *Bot) Upsert(ctx context.Context, req *model.Bot) error {
	updateColumns := []string{"unknown_prompt"}
	if req.Avatar != "" {
		updateColumns = append(updateColumns, "avatar")
	}
	if req.Name != "" {
		updateColumns = append(updateColumns, "name")
	}

	return b.model(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "key"}},
		DoUpdates: clause.AssignmentColumns(updateColumns),
	}).Create(req).Error
}

func (b *Bot) GetByKey(ctx context.Context, res any, key string) error {
	return b.model(ctx).Where("key = ?", key).First(&res).Error
}

func newBot(db *database.DB) *Bot {
	return &Bot{
		base: base[*model.Bot]{
			db: db, m: &model.Bot{},
		},
	}
}

func init() {
	register(newBot)
}
