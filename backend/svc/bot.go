package svc

import (
	"context"
	"errors"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type Bot struct {
	userID uint

	oc      oss.Client
	repoBot *repo.Bot
}

type BotSetReq struct {
	Avatar        *multipart.FileHeader `form:"avatar" swaggerignore:"true"`
	Name          string                `form:"name" binding:"required"`
	UnknownPrompt string                `form:"unknown_prompt" binding:"required"`
}

func (b *Bot) Set(ctx context.Context, req BotSetReq) error {
	avatarPath := ""
	if req.Avatar != nil {
		f, err := req.Avatar.Open()
		if err != nil {
			return err
		}
		defer f.Close()

		avatarPath, err = b.oc.Upload(ctx, "avatar", f,
			oss.WithLimitSize(),
			oss.WithFileSize(int(req.Avatar.Size)),
			oss.WithExt(filepath.Ext(req.Avatar.Filename)),
			oss.WithPublic(),
		)
		if err != nil {
			return err
		}

		res, err := b.Get(ctx)
		if err != nil {
			return err
		}
		if res.Avatar != "" {
			err = b.oc.Delete(ctx, util.TrimFistDir(res.Avatar))
			if err != nil {
				return err
			}
		}
	}

	bot := model.Bot{
		Key:           model.BotKeyDisscution,
		Name:          req.Name,
		Avatar:        avatarPath,
		UnknownPrompt: strings.TrimSpace(req.UnknownPrompt),
	}

	err := b.repoBot.Create(ctx, &bot)
	if err != nil {
		return err
	}

	return nil
}

type BotGetRes struct {
	UserID        uint   `json:"user_id"`
	Avatar        string `json:"avatar"`
	Name          string `json:"name"`
	UnknownPrompt string `json:"unknown_prompt"`
}

func (b *Bot) Get(ctx context.Context) (*BotGetRes, error) {
	var botInfo BotGetRes
	err := b.repoBot.GetByKey(ctx, &botInfo, model.BotKeyDisscution)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			return &BotGetRes{}, nil
		}
		return nil, err
	}

	return &botInfo, nil
}

func (b *Bot) GetUserID(ctx context.Context) (uint, error) {
	if b.userID > 0 {
		return b.userID, nil
	}

	res, err := b.Get(ctx)
	if err != nil {
		return 0, err
	}

	b.userID = res.UserID

	return b.userID, nil
}

func newBot(bot *repo.Bot, oc oss.Client) *Bot {
	return &Bot{repoBot: bot, oc: oc}
}

func init() {
	registerSvc(newBot)
}
