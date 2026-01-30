package svc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/chat"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/llm"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type chatCache struct {
	cfg *model.SystemChat
	bot chat.Bot
}

type Chat struct {
	repoSys       *repo.System
	svcDisc       *Discussion
	svcPublicAddr *PublicAddress
	logger        *glog.Logger
	repoOrg       *repo.Org
	repoForum     *repo.Forum
	stateMgr      *chat.StateManager

	lock         sync.Mutex
	cache        sync.Map
	systemKeyMap map[chat.Type]string
}

var canNotAnswerLen = len("无法回答问题")

func (c *Chat) botCallback(ctx context.Context, req chat.BotReq) (*llm.Stream[string], error) {
	sessionID, err := c.svcDisc.CreateOrLastSession(ctx, 0, CreateOrLastSessionReq{
		ForceCreate: true,
	}, false)
	if err != nil {
		return nil, err
	}

	publicAddr, err := c.svcPublicAddr.Get(ctx)
	if err != nil {
		return nil, err
	}

	defaultOrg, err := c.repoOrg.GetDefaultOrg(ctx)
	if err != nil {
		return nil, err
	}

	var forums []model.Forum
	if len(defaultOrg.ForumIDs) > 0 {
		err = c.repoForum.List(ctx, &forums, repo.QueryWithEqual("id", defaultOrg.ForumIDs, repo.EqualOPEqAny))
		if err != nil {
			return nil, err
		}
	}

	stream, err := c.svcDisc.Ask(ctx, 0, DiscussionAskReq{
		SessionID: sessionID,
		Question:  req.Question,
		Source:    model.AskSessionSourceBot,
	})
	if err != nil {
		return nil, err
	}

	wrapStream := llm.NewStream[string]()
	go func() {
		defer stream.Close()

		var stringBuilder strings.Builder
		ret := false
		writed := false
		retText := "前往社区搜索相似帖子"

		for {
			item, _, ok := stream.Text(ctx)
			if !ok {
				if stringBuilder.String() != "无法回答问题" {
					if !writed {
						wrapStream.RecvOne(stringBuilder.String(), false)
						writed = true
					}
					ret = true
				}
				break
			}

			switch item.Type {
			case "need_human":
				retText = "发帖"
				fallthrough
			case "text":
				if stringBuilder.Len() <= canNotAnswerLen {
					stringBuilder.WriteString(item.Content)
					continue
				}

				if !writed {
					wrapStream.RecvOne(stringBuilder.String(), false)
					writed = true
				}

				wrapStream.RecvOne(item.Content, false)
			}
		}

		if ret {
			wrapStream.RecvOne(fmt.Sprintf("\n\n---\n\n[%s](%s)", retText, publicAddr.FullURL("/")), true)
			return
		}

		if len(forums) != 1 {
			mdLinks := make([]string, len(forums))
			for i, forum := range forums {
				mdLinks[i] = fmt.Sprintf("[%s](%s)", forum.Name, publicAddr.FullURL("/"+forum.RouteName))
			}
			wrapStream.RecvOne(fmt.Sprintf(`抱歉，我暂时无法回答这个问题。请选择一个板块，我将为您搜索相关帖子。

**请选择板块继续搜索**

%s`, strings.Join(mdLinks, ", ")), true)
			return
		}

		for c.svcDisc.IsAskSessionStreaming(ctx, sessionID) {
			time.Sleep(time.Second)
		}

		summaryStream, err := c.svcDisc.SummaryByContent(ctx, 0, SummaryByContentReq{
			SessionID:   sessionID,
			ForumID:     forums[0].ID,
			Source:      model.AskSessionSourceBot,
			ReferFormat: false,
		})
		if err != nil {
			c.logger.WithContext(ctx).WithErr(err).With("session_id", sessionID).Warn("summary by content failed")
			wrapStream.RecvOne("出错了，请稍后再试", true)
			return
		}
		defer summaryStream.Close()

		for {
			item, _, ok := summaryStream.Text(ctx)
			if !ok {
				break
			}

			switch item.Type {
			case "disc_count":
				if item.Content == "0" {
					wrapStream.RecvOne("抱歉，暂时没有找到相关帖子。", false)
					break
				}

				wrapStream.RecvOne("共找到"+item.Content+"个结果\n", false)
			case "disc":
				var discItem model.AskSessionSummaryDisc
				err = json.Unmarshal([]byte(item.Content), &discItem)
				if err != nil {
					c.logger.WithContext(ctx).WithErr(err).With("content", item.Content).Warn("unmarshal failed")
					continue
				}

				wrapStream.RecvOne(fmt.Sprintf("> [%s](%s)\n>\n", discItem.Title, publicAddr.FullURL("/"+forums[0].RouteName+"/"+discItem.UUID)), false)
			case "text":
				wrapStream.RecvOne(item.Content, false)
			}
		}

		wrapStream.RecvOne(fmt.Sprintf("\n\n---\n\n[前往社区发帖提问](%s)", publicAddr.FullURL("/")), true)
	}()

	return wrapStream, nil
}

func (c *Chat) getCache(ctx context.Context, typ chat.Type) (*chatCache, error) {
	val, ok := c.cache.Load(typ)
	if ok {
		return val.(*chatCache), nil
	}

	systemKey, ok := c.systemKeyMap[typ]
	if !ok {
		return nil, errors.ErrUnsupported
	}

	var dbChat model.SystemChat
	err := c.repoSys.GetValueByKey(ctx, &dbChat, systemKey)
	if err != nil {
		if errors.Is(err, database.ErrRecordNotFound) {
			cache := &chatCache{
				cfg: &model.SystemChat{},
				bot: nil,
			}
			c.cache.Store(typ, cache)
			return cache, nil
		}

		return nil, err
	}

	var bot chat.Bot
	if dbChat.Enabled {
		bot, err = chat.New(chat.TypeDingtalk, dbChat.Config, c.botCallback, c.svcPublicAddr.Callback, c.stateMgr)
		if err != nil {
			c.logger.WithContext(ctx).With("cfg", dbChat.Config).Warn("new chat bot failed")
		}
	}

	cache := &chatCache{
		cfg: &dbChat,
		bot: bot,
	}
	c.cache.Store(typ, cache)
	return cache, nil
}

type ChatGetReq struct {
	Type chat.Type `form:"type" binding:"required"`
}

func (c *Chat) Get(ctx context.Context, req ChatGetReq) (*model.SystemChat, error) {
	cache, err := c.getCache(ctx, req.Type)
	if err != nil {
		return nil, err
	}
	return cache.cfg, nil
}

type ChatUpdateReq struct {
	Type chat.Type `json:"type" binding:"required"`
	model.SystemChat
}

func (c *Chat) Update(ctx context.Context, req ChatUpdateReq) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if req.Enabled {
		err := req.Config.Check()
		if err != nil {
			return err
		}
	}

	systemKey, ok := c.systemKeyMap[req.Type]
	if !ok {
		return errors.ErrUnsupported
	}

	cache, err := c.getCache(ctx, req.Type)
	if err != nil {
		return err
	}

	var newBot chat.Bot
	if req.Enabled {
		newBot, err = chat.New(req.Type, req.Config, c.botCallback, c.svcPublicAddr.Callback, c.stateMgr)
		if err != nil {
			return err
		}
	}

	if !req.Enabled {
		if cache.bot != nil {
			cache.bot.Stop()
			cache.bot = nil
		}
	} else if !cache.cfg.Enabled || cache.cfg.Config != req.Config {
		if cache.bot != nil {
			cache.bot.Stop()
		}

		cache.bot = newBot
		err = cache.bot.Start()
		if err != nil {
			return err
		}
	}

	err = c.repoSys.Upsert(ctx, &model.System[any]{
		Key:   systemKey,
		Value: model.NewJSONBAny(req),
	})
	if err != nil {
		return err
	}

	return nil
}

type WecomVerifyReq struct {
	chat.VerifySign
	EchoStr string `form:"echostr" binding:"required"`
}

func (c *Chat) StreamText(ctx context.Context, typ chat.Type, req chat.VerifyReq) (string, error) {
	cache, err := c.getCache(ctx, typ)
	if err != nil {
		return "", err
	}

	bot := cache.bot

	if bot == nil {
		return "", errors.New("bot not exist")
	}

	return bot.StreamText(ctx, req)
}

type SteamAnswerReq struct {
	ID string `form:"id" binding:"required"`
}

func (c *Chat) StreamAnswer(ctx context.Context, req SteamAnswerReq) error {
	return errors.ErrUnsupported
}

func newChat(lc fx.Lifecycle, sys *repo.System, disc *Discussion, publicAddr *PublicAddress, repoOrg *repo.Org, repoForum *repo.Forum, stateMgr *chat.StateManager) *Chat {
	c := &Chat{
		repoSys:       sys,
		svcDisc:       disc,
		svcPublicAddr: publicAddr,
		repoOrg:       repoOrg,
		repoForum:     repoForum,
		stateMgr:      stateMgr,
		cache:         sync.Map{},
		systemKeyMap: map[chat.Type]string{
			chat.TypeDingtalk: model.SystemKeyChatDingtalk,
			chat.TypeWecom:    model.SystemKeyChatWecom,
		},
		logger: glog.Module("svc", "chat"),
	}
	lc.Append(fx.StartHook(func(ctx context.Context) error {
		for _, typ := range []chat.Type{chat.TypeDingtalk, chat.TypeWecom} {
			cache, err := c.getCache(ctx, typ)
			if err != nil {
				return err
			}

			if cache.bot == nil {
				return nil
			}

			err = cache.bot.Start()
			if err != nil {
				c.logger.WithContext(ctx).With("cfg", cache.cfg.Config).Warn("start chat bot failed")
			}
		}

		return nil
	}))
	return c
}

func init() {
	registerSvc(newChat)
}
