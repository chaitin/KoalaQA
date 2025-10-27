package message

import (
	"context"
	"errors"
	"path"
	"strconv"

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
	RepoDoc        *repo.KBDocument
}

type commonGetter struct {
	in commonGetterIn
}

func newCommonGetter(in commonGetterIn) *commonGetter {
	return &commonGetter{in: in}
}

func (c *commonGetter) DiscussMessage(ctx context.Context, dissID uint, userID uint) (*Common, error) {
	var discuss struct {
		CreatedAt model.Timestamp `gorm:"type:timestamp with time zone"`
		ForumID   uint
		UUID      string
		Title     string
		GroupIDs  model.Int64Array  `gorm:"type:bigint[]"`
		Tags      model.StringArray `gorm:"type:text[]"`
	}
	err := c.in.RepoDiscuss.GetByID(ctx, &discuss, dissID, repo.QueryWithSelectColumn("created_at", "title", "forum_id", "group_ids", "uuid", "tags"))
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

	discussURL, err := c.publicAddress(ctx, path.Join("forum", strconv.FormatUint(uint64(discuss.ForumID), 10), "discuss", discuss.UUID))
	if err != nil {
		return nil, err
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

func (c *commonGetter) publicAddress(ctx context.Context, path string) (string, error) {
	var publicAddress model.PublicAddress
	err := c.in.RepoSystem.GetValueByKey(ctx, &publicAddress, model.SystemKeyPublicAddress)
	if err != nil {
		if !errors.Is(err, database.ErrRecordNotFound) {
			return "", err
		}

		return "", nil
	}

	return publicAddress.FullURL(path), nil
}

func (c *commonGetter) DocMessage(ctx context.Context, kbID uint, docID uint) (*commonDoc, error) {
	var doc model.KBDocument
	err := c.in.RepoDoc.GetByID(ctx, &doc, kbID, docID)
	if err != nil {
		return nil, err
	}

	docURL, err := c.publicAddress(ctx, "admin/ai/qa")
	if err != nil {
		return nil, err
	}
	if docURL != "" {
		docURL = docURL + "?id=" + strconv.FormatUint(uint64(kbID), 10)
	}

	return &commonDoc{
		ID:    doc.ID,
		Title: doc.Title,
		URL:   docURL,
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
