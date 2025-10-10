package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/report"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/google/uuid"
)

type reportInstall struct {
	v *version.Info
	c config.Config
}

func (m *reportInstall) Version() int64 {
	return 20251010184733
}

func (m *reportInstall) Migrate(tx *gorm.DB) error {
	r := report.NewReport(m.v, m.c)
	id := uuid.NewString()
	go r.ReportInstallation(id)
	return tx.Model(&model.System[string]{}).Create(&model.System[string]{
		Key:   model.SystemKeyMachineID,
		Value: model.NewJSONB(id),
	}).Error
}

func newReportInstall(v *version.Info, c config.Config) migrator.Migrator {
	return &reportInstall{v: v, c: c}
}

func init() {
	registerDBMigrator(newReportInstall)
}
