package cron

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
)

type spaceUpdate struct {
	doc     *svc.KBDocument
	repoDoc *repo.KBDocument
	logger  *glog.Logger
}

func (s *spaceUpdate) Period() string {
	return "0 0 0 */1 * ?"
}

func (s *spaceUpdate) Run() {
	ctx := context.Background()
	logger := s.logger.WithContext(ctx)

	logger.Debug("start update space")

	var spaces []model.KBDocument
	err := s.repoDoc.List(ctx, &spaces,
		repo.QueryWithEqual("doc_type", model.DocTypeSpace),
		repo.QueryWithEqual("parent_id", 0),
	)
	if err != nil {
		logger.WithErr(err).Warn("get all space failed")
		return
	}

	for _, space := range spaces {
		folderRes, err := s.doc.ListSpaceFolder(ctx, space.KBID, space.ID)
		if err != nil {
			logger.WithErr(err).Warn("list space folder failed")
			continue
		}

		for _, folder := range folderRes.Items {
			err = s.doc.UpdateSpaceFolder(ctx, space.KBID, folder.ID)
			if err != nil {
				logger.WithErr(err).Warn("update space folder failed")
				continue
			}
		}
	}
}

func newSpaceUpdate(doc *svc.KBDocument, repoDoc *repo.KBDocument) Task {
	return &spaceUpdate{
		doc:     doc,
		repoDoc: repoDoc,
		logger:  glog.Module("cron", "space_update"),
	}
}

func init() {
	register(newSpaceUpdate)
}
