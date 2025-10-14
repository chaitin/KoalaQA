package report

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/chaitin/koalaqa/pkg/aes"
	"github.com/chaitin/koalaqa/pkg/config"
	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/version"
)

type InstallData struct {
	MachineID string `json:"machine_id"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`
}

type Reporter struct {
	version *version.Info
	cfg     config.Config
	logger  *glog.Logger
}

func NewReport(version *version.Info, cfg config.Config) *Reporter {
	r := &Reporter{
		logger:  glog.Module("reporter"),
		cfg:     cfg,
		version: version,
	}
	return r
}

func (r *Reporter) Report(index string, data any) error {
	dataRaw, err := json.Marshal(data)
	if err != nil {
		return err
	}

	encrypt, err := aes.Encrypt([]byte("SZ3SDP38y9Gg2c6yHdLPgDeX"), string(dataRaw))
	if err != nil {
		return err
	}

	event := map[string]any{
		"index": index,
		"id":    uuid.NewString(),
		"data":  encrypt,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	if _, err := http.Post("https://baizhi.cloud/api/public/data/report", "application/json", bytes.NewReader(body)); err != nil {
		r.logger.With("error", err).Warn("report installation failed")
		return err
	}

	return nil
}

func (r *Reporter) ReportInstallation(id string) error {
	if r.cfg.API.DEV {
		return nil
	}

	return r.Report("koala-installation", InstallData{
		MachineID: id,
		Version:   r.version.Version(),
		Timestamp: time.Now().Format(time.RFC3339),
		Type:      "installation",
	})
}

func (r *Reporter) ReportHeartbeat(id string) error {
	if r.cfg.API.DEV {
		return nil
	}
	return r.Report("koala-installation", InstallData{
		MachineID: id,
		Version:   r.version.Version(),
		Timestamp: time.Now().Format(time.RFC3339),
		Type:      "heartbeat",
	})
}
