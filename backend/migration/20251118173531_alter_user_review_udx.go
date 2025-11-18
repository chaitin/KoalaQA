package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
)

type alterUserReviewUdx struct{}

func (m *alterUserReviewUdx) Version() int64 {
	return 20251118173531
}

func (m *alterUserReviewUdx) Migrate(tx *gorm.DB) error {
	err := tx.Exec("DROP INDEX IF EXISTS udx_user_review_type_user_id").Error
	if err != nil {
		return err
	}

	return tx.Exec("CREATE UNIQUE INDEX udx_user_review_type_user_id ON user_reviews (type, user_id) WHERE state = ?", model.UserReviewStateReview).Error
}

func newAlterUserReviewUdx() migrator.Migrator {
	return &alterUserReviewUdx{}
}

func init() {
	registerDBMigrator(newAlterUserReviewUdx)
}
