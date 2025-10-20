package message

import (
	"context"
	"errors"
	"path"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
	"github.com/chaitin/koalaqa/repo"
	"go.uber.org/fx"
)

type commonGetterIn struct {
	fx.In

	RepoSystem     *repo.System
	RepoUser       *repo.User
	RepoDiscuss    *repo.Discussion
	RepoGroupItems *repo.GroupItem
	RepoUserThird  *repo.UserThird
}

type commonGetter struct {
	in commonGetterIn
}

func newCommonGetter(in commonGetterIn) *commonGetter {
	return &commonGetter{in: in}
}

func (c *commonGetter) Message(ctx context.Context, dissID uint, userID uint) (*Common, error) {
	var discuss struct {
		CreatedAt model.Timestamp `gorm:"type:timestamp with time zone"`
		UUID      string
		Title     string
		GroupIDs  model.Int64Array  `gorm:"type:bigint[]"`
		Tags      model.StringArray `gorm:"type:text[]"`
	}
	err := c.in.RepoDiscuss.GetByID(ctx, &discuss, dissID, repo.QueryWithSelectColumn("created_at", "title", "group_ids", "uuid", "tags"))
	if err != nil {
		return nil, err
	}

	var groupItems []struct {
		Name string
	}
	err = c.in.RepoGroupItems.List(ctx, &groupItems,
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

	var user model.User
	err = c.in.RepoUser.GetByID(ctx, &user, userID)
	if err != nil {
		return nil, err
	}

	var userThirds []model.UserThird
	err = c.in.RepoUserThird.List(ctx, &userThirds, repo.QueryWithEqual("user_id", userID))
	if err != nil {
		return nil, err
	}

	discussURL := ""
	var publicAddress model.PublicAddress
	err = c.in.RepoSystem.GetValueByKey(ctx, &publicAddress, model.SystemKeyPublicAddress)
	if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
		return nil, err
	} else if err == nil {
		discussURL = publicAddress.FullURL(path.Join("discuss", discuss.UUID))
	}

	messageThirds := make([]commonUserThird, len(userThirds))
	for i, v := range userThirds {
		messageThirds[i] = commonUserThird{
			Type: v.Type,
			ID:   v.ThirdID,
		}
	}

	return &Common{
		Discussion: commonDiscussion{
			ID:        dissID,
			CreatedAt: discuss.CreatedAt,
			UUID:      discuss.UUID,
			Title:     discuss.Title,
			Groups:    items,
			Tags:      discuss.Tags,
			URL:       discussURL,
		},
		User: commonUser{
			ID:     userID,
			Thirds: messageThirds,
			Name:   user.Name,
		},
	}, nil
}

func NewTestCommon() Common {
	return Common{
		User: commonUser{
			ID: 1,
			Thirds: []commonUserThird{
				{
					ID:   "123",
					Type: model.AuthTypeOIDC,
				},
			},
			Name: "test",
		},
		Discussion: commonDiscussion{
			ID:     1,
			UUID:   "123",
			Title:  "test title",
			Groups: []string{"123", "234"},
			Tags:   []string{"345", "456"},
			URL:    "http://gang.yang.com",
		},
	}
}
