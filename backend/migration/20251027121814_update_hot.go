package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type updateHot struct{}

func (m *updateHot) Version() int64 {
	return 20251027121814
}

func (m *updateHot) Migrate(tx *gorm.DB) error {
	hotFormula := `(
		0.3 * LN(GREATEST(view, 0) + 1) + 
		0.4 * LN(GREATEST("like", 0) + 1) + 
		0.3 * LN(GREATEST(comment, 0) + 1)
	) * EXP(-0.01 * EXTRACT(EPOCH FROM (NOW() - updated_at))/3600)
	  * 10000
	  * CASE WHEN resolved = ? THEN 1.3 ELSE 1.0 END`

	if err := tx.Model(&model.Discussion{}).Where("id > 0").
		Updates(map[string]any{
			"hot":        gorm.Expr(hotFormula, model.DiscussionStateResolved),
			"updated_at": gorm.Expr("updated_at"),
		}).Error; err != nil {
		return err
	}
	return nil
}

func newUpdateHot() migrator.Migrator {
	return &updateHot{}
}

func init() {
	registerDBMigrator(newUpdateHot)
}
