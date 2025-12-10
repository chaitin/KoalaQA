package cron

import (
	"context"
	"strings"
	"time"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/consts"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/repo"
	"github.com/chaitin/koalaqa/svc"
	"github.com/sabloger/sitemap-generator/smg"
)

type sitemap struct {
	logger        *glog.Logger
	publicAddress *svc.PublicAddress
	repoForum     *repo.Forum
	repoDisc      *repo.Discussion
	repoOrg       *repo.Org
}

func (s *sitemap) Period() string {
	return "0 10 0 * *"
}

func (s *sitemap) Run() {
	ctx := context.Background()

	s.logger.Info("sitemap task begin...")
	address, err := s.publicAddress.Get(ctx)
	if err != nil {
		s.logger.WithErr(err).Warn("get public address failed")
		return
	}

	if address.Address == "" {
		s.logger.WithErr(err).Info("empty public address, skip generate")
		return
	}

	smi := smg.NewSitemapIndex(true)
	smi.SetCompress(false)
	smi.SetSitemapIndexName(strings.TrimSuffix(consts.SitemapIndexFilename, ".xml"))
	smi.SetHostname(address.Address)
	smi.SetOutputPath(consts.SitemapDir)
	smi.SetServerURI("/api/sitemap")

	org, err := s.repoOrg.GetBuiltin(ctx)
	if err != nil {
		s.logger.WithErr(err).Warn("get builtin org failed")
		return
	}
	if len(org.ForumIDs) == 0 {
		s.logger.Info("builtin org without forum, skip generate sitemap")
		return
	}

	var forums []model.Forum
	err = s.repoForum.List(ctx, &forums, repo.QueryWithEqual("id", org.ForumIDs, repo.EqualOPEqAny))
	if err != nil {
		s.logger.WithErr(err).Warn("list forum failed")
		return
	}

	now := time.Now()
	for _, forum := range forums {
		smForum := smi.NewSitemap()
		smForum.SetName(forum.RouteName)
		smForum.SetLastMod(&now)
		smForum.SetMaxURLsCount(10000)

		lastID := uint(0)
		for {
			var discs []model.Discussion
			err = s.repoDisc.List(ctx, &discs,
				repo.QueryWithEqual("discussions.forum_id", forum.ID),
				repo.QueryWithSelectColumn("discussions.id", "discussions.uuid", "discussions.updated_at"),
				repo.QueryWithOrderBy("discussions.id ASC"),
				repo.QueryWithEqual("discussions.id", lastID, repo.EqualOPGT),
			)
			if err != nil {
				s.logger.WithErr(err).Warn("list discussion failed")
				return
			}

			if len(discs) == 0 {
				break
			}

			for _, disc := range discs {
				t := disc.UpdatedAt.Time()
				err = smForum.Add(&smg.SitemapLoc{
					Loc:        forum.RouteName + "/" + disc.UUID,
					LastMod:    &t,
					ChangeFreq: smg.Daily,
					Priority:   0.5,
				})
				if err != nil {
					s.logger.WithErr(err).With("disc", disc).Warn("add disc to sitemap failed")
					return
				}
			}

			lastID = discs[len(discs)-1].ID
		}
	}

	_, err = smi.Save()
	if err != nil {
		s.logger.WithErr(err).Warn("save sitemap failed")
		return
	}
}

func newSitemap(publicAddress *svc.PublicAddress, forum *repo.Forum, disc *repo.Discussion) Task {
	return &sitemap{
		logger:        glog.Module("cron", "sitemap"),
		publicAddress: publicAddress,
		repoForum:     forum,
		repoDisc:      disc,
	}
}

func init() {
	register(newSitemap)
}
