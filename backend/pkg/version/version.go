package version

import (
	"fmt"
)

var (
	Version   = "v0.0.0"
	BuildTime = ""
	GitCommit = "dev"
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
