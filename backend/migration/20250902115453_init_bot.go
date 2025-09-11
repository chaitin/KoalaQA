package migration

import (
	"bytes"
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/assets"
	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/google/uuid"
)

type initBot struct {
	oc oss.Client
}

func (m *initBot) Version() int64 {
	return 20250902115453
}

func (m *initBot) Migrate(tx *gorm.DB) error {
	p, err := m.oc.Upload(context.Background(), "assets", bytes.NewReader(assets.BotAvatar),
		oss.WithFileSize(len(assets.BotAvatar)),
		oss.WithExt(".png"),
		oss.WithPublic(),
	)
	if err != nil {
		return err
	}

	botUser := model.User{
		Name:      "售后在线客服",
		Avatar:    p,
		Builtin:   true,
		Role:      model.UserRoleUser,
		Invisible: true,
		Key:       uuid.NewString(),
	}

	err = tx.Create(&botUser).Error
	if err != nil {
		return err
	}
	bot := model.Bot{
		UserID: botUser.ID,
		Name:   botUser.Name,
		Avatar: botUser.Avatar,
		Key:    model.BotKeyDisscution,
		UnknownPrompt: `无法定位问题，麻烦补充
1. 产品相关信息
2. 具体操作步骤
3. 报错详情`,
	}

	err = tx.Create(&bot).Error
	if err != nil {
		return err
	}
	return nil
}

func newInitBot(oc oss.Client) migrator.Migrator {
	return &initBot{oc: oc}
}

func init() {
	registerDBMigrator(newInitBot)
}
