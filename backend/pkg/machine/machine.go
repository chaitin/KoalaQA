package machine

import (
	"crypto/md5"
	"crypto/sha256"
	"fmt"
	"net"
	"os"
	"runtime"
	"sort"
	"strings"
)

type MachineInfo struct {
	Hostname     string   `json:"hostname"`
	MACAddresses []string `json:"mac_addresses"`
	OSType       string   `json:"os_type"`
	OSRelease    string   `json:"os_release"`
	CPUInfo      string   `json:"cpu_info"`
}

func GetMachineInfo() (*MachineInfo, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("failed to get hostname: %w", err)
	}

	macAddresses, err := getMACAddresses()
	if err != nil {
		return nil, fmt.Errorf("failed to get MAC addresses: %w", err)
	}

	return &MachineInfo{
		Hostname:     hostname,
		MACAddresses: macAddresses,
		OSType:       runtime.GOOS,
		OSRelease:    getOSRelease(),
		CPUInfo:      getCPUInfo(),
	}, nil
}

func GenerateMachineID() (string, error) {
	machineInfo, err := GetMachineInfo()
	if err != nil {
		return "", err
	}

	var parts []string
	parts = append(parts, machineInfo.Hostname)
	parts = append(parts, strings.Join(machineInfo.MACAddresses, ","))
	parts = append(parts, machineInfo.OSType)
	parts = append(parts, machineInfo.OSRelease)
	parts = append(parts, machineInfo.CPUInfo)

	combined := strings.Join(parts, "|")
	hash := sha256.Sum256([]byte(combined))
	return fmt.Sprintf("%x", hash), nil
}

func GenerateShortMachineID() (string, error) {
	machineInfo, err := GetMachineInfo()
	if err != nil {
		return "", err
	}

	var parts []string
	parts = append(parts, machineInfo.Hostname)
	if len(machineInfo.MACAddresses) > 0 {
		parts = append(parts, machineInfo.MACAddresses[0])
	}
	parts = append(parts, machineInfo.OSType)

	combined := strings.Join(parts, "|")
	hash := md5.Sum([]byte(combined))
	return fmt.Sprintf("%x", hash), nil
}

func getMACAddresses() ([]string, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	var macAddresses []string
	for _, iface := range interfaces {
		if iface.Flags&net.FlagLoopback != 0 || len(iface.HardwareAddr) == 0 {
			continue
		}
		macAddresses = append(macAddresses, iface.HardwareAddr.String())
	}

	sort.Strings(macAddresses)
	return macAddresses, nil
}

func getOSRelease() string {
	return runtime.GOARCH
}

func getCPUInfo() string {
	return fmt.Sprintf("%s_%d", runtime.GOARCH, runtime.NumCPU())
}
