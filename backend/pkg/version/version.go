package version

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/chaitin/koalaqa/pkg/glog"
	"github.com/chaitin/koalaqa/pkg/util"
)

var (
	Version              = "v0.0.0"
	BuildTime            = ""
	GitCommit            = "dev"
	latestVersion        = "v0.0.0"
	lastVersionCheckedAt time.Time
	tz                   = "Asia/Shanghai"
)

type Info struct{}

func NewInfo() *Info {
	return &Info{}
}

func (v *Info) Print() {
	fmt.Printf("Version:    %s\n", Version)
	fmt.Printf("BuildTime:  %s\n", BuildTime)
	fmt.Printf("GitCommit:  %s\n", GitCommit)
}

func (v *Info) Version() string {
	return Version
}

func (v *Info) BuildTime() string {
	return BuildTime
}

func (v *Info) GitCommit() string {
	return GitCommit
}

func (v *Info) TZ() string {
	return tz
}

func (v *Info) LatestVersion() string {
	now := time.Now()
	if lastVersionCheckedAt.Add(time.Hour).Before(now) {
		err := v.updateLatestVersion()
		if err != nil {
			glog.WithErr(err).Warn("update latest version failed")
		}

		lastVersionCheckedAt = now
	}

	return latestVersion
}

func (v *Info) SetLatestVersion(newVersion string) {
	latestVersion = newVersion
}

func (v *Info) updateLatestVersion() error {
	body, err := util.HTTPGet("https://release.baizhi.cloud/koala-qa/version.json")
	if err != nil {
		return err
	}

	var res struct {
		Version string `json:"version"`
	}

	err = json.Unmarshal(body, &res)
	if err != nil {
		return err
	}

	if res.Version == "" {
		return errors.New("empty response version")
	}

	latestVersion = res.Version
	return nil
}

func init() {
	tmpTZ := os.Getenv("TZ")
	if tmpTZ != "" {
		tz = tmpTZ
	}

	glog.With("tz", tz).Info("current tz")
}
