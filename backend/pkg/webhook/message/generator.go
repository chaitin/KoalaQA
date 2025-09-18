package message

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type generatorIn struct {
	fx.In

	RepoSystem     *repo.System
	RepoUser       *repo.User
	RepoDiscuss    *repo.Discussion
	RepoGroupItems *repo.GroupItem
}

type Generator struct {
	in     generatorIn
	logger *glog.Logger
}

func NewGenerator(in generatorIn) *Generator {
	return &Generator{
		in:     in,
		logger: glog.Module("webhook", "message", "generator"),
	}
}

func (g *Generator) Discuss(ctx context.Context, msgType Type, dissID uint, userID uint) (Message, error) {
	var discuss struct {
		UUID     string
		Title    string
		GroupIDs model.Int64Array `gorm:"type:bigint[]"`
	}
	err := g.in.RepoDiscuss.GetByID(ctx, &discuss, dissID, repo.QueryWithSelectColumn("title", "group_ids", "uuid"))
	if err != nil {
		return nil, err
	}

	var groupItems []struct {
		Name string
	}
	err = g.in.RepoGroupItems.List(ctx, &groupItems,
		repo.QueryWithEqual("id", discuss.GroupIDs, repo.EqualOPEqAny),
		repo.QueryWithSelectColumn("name"),
	)
	if err != nil {
		return nil, err
	}

	items := make([]string, len(groupItems))
	for i, v := range groupItems {
		items[i] = v.Name
	}

	itemStr := strings.Join(items, "、")

	var user model.User
	err = g.in.RepoUser.GetByID(ctx, &user, userID)
	if err != nil {
		return nil, err
	}

	discussURL := ""
	var publicAddress model.PublicAddress
	err = g.in.RepoSystem.GetValueByKey(ctx, &publicAddress, model.SystemKeyPublicAddress)
	if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
		return nil, err
	} else if err == nil {
		discussURL = publicAddress.FullURL(path.Join("discuss", discuss.UUID))
	}

	body := DiscussBody{
		Heading:    discuss.Title,
		GroupItems: itemStr,
		Username:   user.Name,
		URL:        discussURL,
	}

	g.logger.WithContext(ctx).With("discuss_body", body).Debug("generate discuss message")

	switch msgType {
	case TypeDislikeBotComment:
		return NewBotDislikeComment(body), nil
	case TypeBotUnknown:
		return NewBotUnknown(body), nil
	default:
		return nil, fmt.Errorf("action %d not support", msgType)
	}
}
