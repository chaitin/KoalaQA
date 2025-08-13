package migrator

import "github.com/chaitin/koalaqa/pkg/database"

type Migrator interface {
	Version() int64
	Migrate(*database.DB) error
}
