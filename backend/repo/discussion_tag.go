package repo

import (
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type DiscussionTag struct {
	base[*model.DiscussionTag]
}

func newDiscussionTag(db *database.DB) *DiscussionTag {
	return &DiscussionTag{base: base[*model.DiscussionTag]{db: db, m: &model.DiscussionTag{}}}
}

func init() {
	register(newDiscussionTag)
}
