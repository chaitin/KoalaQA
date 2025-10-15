package cron

import (
	"context"

	"github.com/chaitin/koalaqa/model"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	r "github.com/chaitin/koalaqa/pkg/report"
	"github.com/chaitin/koalaqa/pkg/version"
	"github.com/chaitin/koalaqa/repo"
)

type report struct {
	logger *glog.Logger
	r      *r.Reporter
	system *repo.System
}

func (r *report) Period() string {
	return "0 0 * * *"
}

func (r *report) Run() {
	ctx := context.Background()
	logger := r.logger.WithContext(ctx)
	var machineID string
	err := r.system.GetValueByKey(ctx, &machineID, model.SystemKeyMachineID)
	if err != nil {
		logger.WithErr(err).Error("get machine id")
		return
	}
	err = r.r.ReportHeartbeat(machineID)
	if err != nil {
		logger.WithErr(err).Error("report heartbeat")
		return
	}
}

func newReport(v *version.Info, cfg config.Config, s *repo.System) Task {
	r := r.NewReport(v, cfg)
	return &report{
		logger: glog.Module("cron", "report"),
		r:      r,
		system: s,
	}
}

func init() {
	register(newReport)
}
