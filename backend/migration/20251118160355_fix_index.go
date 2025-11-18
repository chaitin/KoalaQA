package migration

import (
	"fmt"

	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type fixIndex struct{}

func (m *fixIndex) Version() int64 {
	return 20251118160355
}

func (m *fixIndex) Migrate(tx *gorm.DB) error {
	var indexes []string

	db, err := tx.DB()
	if err != nil {
		return err
	}

	rows, err := db.Query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
	if err != nil {
		return err
	}
	for rows.Next() {
		var idx string
		err = rows.Scan(&idx)
		if err != nil {
			return err
		}

		indexes = append(indexes, idx)
	}

	for _, idx := range indexes {
		if idx == "" {
			continue
		}

		if _, err := db.Exec(fmt.Sprintf("REINDEX INDEX public.%s", idx)); err != nil {
			return err
		}
	}

	return nil
}

func newFixIndex() migrator.Migrator {
	return &fixIndex{}
}

func init() {
	registerDBMigrator(newFixIndex)
}
