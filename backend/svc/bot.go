package svc

import (
	"context"
	"errors"
	"mime/multipart"
	"path/filepath"
	"strings"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/keyword"
	"github.com/chaitin/koalaqa/pkg/oss"
	"github.com/chaitin/koalaqa/pkg/util"
	"github.com/chaitin/koalaqa/repo"
)

type Bot struct {
	botCache *BotGetRes

	oc      oss.Client
	repoBot *repo.Bot
}

type BotSetReq struct {
	Avatar         *multipart.FileHeader `form:"avatar" swaggerignore:"true"`
	Name           string                `form:"name" binding:"required"`
	UnknownPrompt  string                `form:"unknown_prompt"`
	AnswerRef      bool                  `form:"answer_ref"`
	KeywordsEnable bool                  `form:"keywords_enable"`
	Keywords       string                `form:"keywords"`
}

func (b *Bot) Set(ctx context.Context, req BotSetReq) error {
	dbBot, err := b.Get(ctx)
	if err != nil {
		return err
	}

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

		if dbBot.Avatar != "" {
			err = b.oc.Delete(ctx, util.TrimFirstDir(dbBot.Avatar))
			if err != nil {
				return err
			}
		}
	}

	bot := model.Bot{
		Key: model.BotKeyDisscution,
		BotInfo: model.BotInfo{
			Name:           req.Name,
			Avatar:         avatarPath,
			UnknownPrompt:  strings.TrimSpace(req.UnknownPrompt),
			AnswerRef:      req.AnswerRef,
			KeywordsEnable: req.KeywordsEnable,
			Keywords:       normalizeKeywords(req.Keywords),
		},
	}

	err = b.repoBot.Upsert(ctx, &bot)
	if err != nil {
		return err
	}

	if avatarPath == "" {
		bot.Avatar = dbBot.Avatar
	}
	if req.Name == "" {
		bot.Name = req.Name
	}

	b.botCache.BotInfo = bot.BotInfo
	b.botCache.keywordMatcher = nil
	return nil
}

type BotGetRes struct {
	model.BotInfo

	keywordMatcher *keyword.Matcher
	UserID         uint `json:"user_id"`
}

var lock sync.Mutex

func (b *BotGetRes) MatcherCursor() *keyword.Cursor {
	if b.keywordMatcher != nil {
		return b.keywordMatcher.NewCursor()
	}

	if !b.KeywordsEnable || len(b.Keywords) <= 1000 {
		return nil
	}

	lock.Lock()
	defer lock.Unlock()

	if b.keywordMatcher != nil {
		return b.keywordMatcher.NewCursor()
	}

	matcher := keyword.NewMatcher()
	matcher.AddKeyword(splitKeywords(b.Keywords)...)
	matcher.Build()

	b.keywordMatcher = matcher

	return b.keywordMatcher.NewCursor()
}

func (b *Bot) Get(ctx context.Context) (*BotGetRes, error) {
	if b.botCache != nil {
		return b.botCache, nil
	}

	var botInfo BotGetRes
	err := b.repoBot.GetByKey(ctx, &botInfo, model.BotKeyDisscution)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			b.botCache = &BotGetRes{}
			return b.botCache, nil
		}
		return nil, err
	}

	b.botCache = &botInfo
	return b.botCache, nil
}

func normalizeKeywords(raw string) string {
	parts := splitKeywords(raw)
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, ",")
}

func splitKeywords(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == '，'
	})
	res := make([]string, 0, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
		if trimmed == "" {
			continue
		}
		res = append(res, trimmed)
	}
	return res
}

func newBot(bot *repo.Bot, oc oss.Client) *Bot {
	return &Bot{repoBot: bot, oc: oc}
}

func init() {
	registerSvc(newBot)
}
