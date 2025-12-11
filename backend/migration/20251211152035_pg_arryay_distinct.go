package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type pgArryayDistinct struct{}

func (m *pgArryayDistinct) Version() int64 {
	return 20251211152035
}

func (m *pgArryayDistinct) Migrate(tx *gorm.DB) error {
	return tx.Exec(`CREATE OR REPLACE FUNCTION array_distinct(arr anyarray)
RETURNS anyarray AS $$
BEGIN
    RETURN (
        SELECT COALESCE(ARRAY_AGG(DISTINCT elem), '{}')
        FROM UNNEST(arr) AS elem
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;`).Error
}

func newPgArryayDistinct() migrator.Migrator {
	return &pgArryayDistinct{}
}

func init() {
	registerDBMigrator(newPgArryayDistinct)
}
