package migration

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/repo"
)

type initRankContribute struct {
	repoRank *repo.Rank
}

func (m *initRankContribute) Version() int64 {
	return 20251111102351
}

func (m *initRankContribute) Migrate(tx *gorm.DB) error {
	return m.repoRank.RefresContribute(context.Background())
}

func newInitRankContribute(rank *repo.Rank) migrator.Migrator {
	return &initRankContribute{repoRank: rank}
}

func init() {
	registerDBMigrator(newInitRankContribute)
}
