package repo

import (
	"errors"
	"math"
	"sort"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/database"
)

type Migration struct {
	db *database.DB
}

func (m *Migration) Version(key string) (int64, error) {
	var migration model.Migration
	err := m.db.Model(&model.Migration{}).First(&migration).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return math.MinInt64, nil
		}

		return 0, err
	}

	return migration.Version, nil
}

func (m *Migration) DBAlwaysMigrate(migrators ...migrator.Migrator) error {
	sort.Slice(migrators, func(i, j int) bool {
		return migrators[i].Version() < migrators[j].Version()
	})

	for _, migrator := range migrators {
		err := m.db.Transaction(func(tx *gorm.DB) error {
			return migrator.Migrate(tx)
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (m *Migration) DBMigrate(migrators ...migrator.Migrator) error {
	sort.Slice(migrators, func(i, j int) bool {
		return migrators[i].Version() < migrators[j].Version()
	})

	version, err := m.Version(model.MigrationKeyDB)
	if err != nil {
		return err
	}

	index := sort.Search(len(migrators), func(i int) bool {
		return migrators[i].Version() > version
	})

	for i := index; i < len(migrators); i++ {
		migrator := migrators[i]

		err := m.db.Transaction(func(tx *gorm.DB) error {
			err := migrator.Migrate(tx)
			if err != nil {
				return err
			}

			return m.db.Model(&model.Migration{}).Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "key"}},
				DoUpdates: clause.AssignmentColumns([]string{"version", "updated_at"}),
			}).Create(&model.Migration{
				Key:     model.MigrationKeyDB,
				Version: migrator.Version(),
			}).Error
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func newMigration(db *database.DB) *Migration {
	return &Migration{
		db: db,
	}
}

func init() {
	register(newMigration)
}
