package svc

import (
	"github.com/chaitin/koalaqa/repo"
)

type Forum struct {
	repo *repo.Forum
}

func newForum(forum *repo.Forum) *Forum {
	return &Forum{repo: forum}
}

func init() {
	registerSvc(newForum)
}
