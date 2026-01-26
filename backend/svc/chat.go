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

type Chat struct {
	repoSys       *repo.System
	svcDisc       *Discussion
	svcPublicAddr *PublicAddress
	logger        *glog.Logger
	repoOrg       *repo.Org
	repoForum     *repo.Forum

	cache   *model.SystemChat
	chatBot chat.Bot
	lock    sync.Mutex
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

			if item.Type != "text" {
				continue
			}

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

		if ret {
			wrapStream.RecvOne(fmt.Sprintf("\n\n---\n\n[前往社区搜索相似帖子](%s)", publicAddr.FullURL("/")), true)
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
			SessionID: sessionID,
			ForumID:   forums[0].ID,
			Source:    model.AskSessionSourceBot,
		})
		if err != nil {
			c.logger.WithContext(ctx).WithErr(err).With("session_id", sessionID).Warn("summary by content failed")
			wrapStream.RecvOne("出错了，请稍后再试", true)
			return
		}
		defer summaryStream.Close()

		first := true
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

				wrapStream.RecvOne(fmt.Sprintf("> [%s](%s)\n", discItem.Title, publicAddr.FullURL("/"+forums[0].RouteName+"/"+discItem.UUID)), false)
			case "text":
				if first {
					item.Content = "\n" + item.Content
					first = false
				}
				wrapStream.RecvOne(item.Content, false)
			}
		}

		wrapStream.RecvOne(fmt.Sprintf("\n\n---\n\n[前往社区发帖提问](%s)", publicAddr.FullURL("/")), true)
	}()

	return wrapStream, nil
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
		newBot, err = chat.New(chat.ChatTypeDingtalk, req.Config, c.botCallback)
		if err != nil {
			return err
		}
	}

	if !req.Enabled {
		if c.chatBot != nil {
			c.chatBot.Stop()
			c.chatBot = nil
		}
	} else if !chatCfg.Enabled || chatCfg.Config != req.Config {
		if c.chatBot != nil {
			c.chatBot.Stop()
		}

		c.chatBot = newBot
		err = c.chatBot.Start()
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

	c.cache = &req

	return nil
}

func newChat(lc fx.Lifecycle, sys *repo.System, disc *Discussion, publicAddr *PublicAddress, repoOrg *repo.Org, repoForum *repo.Forum) *Chat {
	c := &Chat{
		repoSys:       sys,
		svcDisc:       disc,
		svcPublicAddr: publicAddr,
		repoOrg:       repoOrg,
		repoForum:     repoForum,
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

		newBot, err := chat.New(chat.ChatTypeDingtalk, chatCfg.Config, c.botCallback)
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
