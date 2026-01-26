package svc

import (
	"context"
	"errors"
	"sync"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/chat"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type Chat struct {
	repoSys       *repo.System
	svcDisc       *Discussion
	svcPublicAddr *PublicAddress
	logger        *glog.Logger

	cache   *model.SystemChat
	chatBot chat.Bot
	lock    sync.Mutex
}

func (c *Chat) botCallback(ctx context.Context, req chat.BotReq) (*llm.Stream[llm.AskSessionStreamItem], error) {
	sessionID, err := c.svcDisc.CreateOrLastSession(ctx, 0, CreateOrLastSessionReq{
		ForceCreate: true,
	}, false)
	if err != nil {
		return nil, err
	}

	return c.svcDisc.Ask(ctx, 0, DiscussionAskReq{
		SessionID: sessionID,
		Question:  req.Question,
		Source:    model.AskSessionSourceBot,
	})
}

func (c *Chat) Get(ctx context.Context) (*model.SystemChat, error) {
	if c.cache != nil {
		return c.cache, nil
	}

	var chat model.SystemChat
	err := c.repoSys.GetValueByKey(ctx, &chat, model.SystemKeyChat)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			c.cache = &model.SystemChat{}
			return c.cache, nil
		}

		return nil, err
	}

	c.cache = &chat
	return c.cache, nil
}

func (c *Chat) Update(ctx context.Context, req model.SystemChat) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if req.Enabled {
		err := req.Config.Check()
		if err != nil {
			return err
		}
	}

	chatCfg, err := c.Get(ctx)
	if err != nil {
		return err
	}

	var newBot chat.Bot
	if req.Enabled {
		newBot, err = chat.New(chat.ChatTypeDingtalk, req.Config, c.botCallback, c.svcPublicAddr.Callback)
		if err != nil {
			return err
		}
	}

	err = c.repoSys.Upsert(ctx, &model.System[any]{
		Key:   model.SystemKeyChat,
		Value: model.NewJSONBAny(req),
	})
	if err != nil {
		return err
	}

	if !req.Enabled {
		if c.chatBot != nil {
			c.chatBot.Stop()
			c.chatBot = nil
		}
	} else if chatCfg.Config != req.Config {
		if c.chatBot != nil {
			c.chatBot.Stop()
		}

		c.chatBot = newBot
		err = c.chatBot.Start()
		if err != nil {
			return err
		}
	}

	c.cache = &req

	return nil
}

func newChat(lc fx.Lifecycle, sys *repo.System, disc *Discussion, publicAddr *PublicAddress) *Chat {
	c := &Chat{
		repoSys:       sys,
		svcDisc:       disc,
		svcPublicAddr: publicAddr,
		logger:        glog.Module("svc", "chat"),
	}
	lc.Append(fx.StartHook(func(ctx context.Context) error {
		chatCfg, err := c.Get(ctx)
		if err != nil {
			return err
		}

		if !chatCfg.Enabled {
			return nil
		}

		newBot, err := chat.New(chat.ChatTypeDingtalk, chatCfg.Config, c.botCallback, c.svcPublicAddr.Callback)
		if err != nil {
			c.logger.WithContext(ctx).With("cfg", chatCfg.Config).Warn("new chat bot failed")
			return nil
		}

		err = newBot.Start()
		if err != nil {
			c.logger.WithContext(ctx).With("cfg", chatCfg.Config).Warn("start chat bot failed")
		} else {
			c.chatBot = newBot
		}

		return nil
	}))
	return c
}

func init() {
	registerSvc(newChat)
}
