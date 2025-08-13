package repo

import (
	"context"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Bot struct {
	base[*model.Bot]
}

func (b *Bot) Create(ctx context.Context, req *model.Bot) error {
	return b.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Model(b.m).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"avatar", "name", "unknown_prompt"}),
		}).Create(req).Error
		if err != nil {
			return err
		}

		var bot model.Bot
		err = tx.Model(b.m).Where("key = ?", req.Key).First(&bot).Error
		if err != nil {
			return err
		}

		err = tx.Model(&model.User{}).Where("id = ?", bot.UserID).Updates(map[string]any{
			"avatar":     bot.Avatar,
			"name":       bot.Name,
			"updated_at": time.Now(),
		}).Error
		if err != nil {
			return err
		}

		return nil
	})

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
