package util

import (
	"crypto/tls"
	"errors"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"
)

var (
	HTTPClient = &http.Client{
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout: time.Second * 5,
			}).DialContext,
			MaxIdleConns:    10,
			MaxConnsPerHost: 10,
			IdleConnTimeout: 30 * time.Second,
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
			Proxy: http.ProxyFromEnvironment,
		},
		Timeout: time.Minute * 2,
	}
)

func init() {
	timeoutStr := strings.TrimSpace(os.Getenv("DEFAULT_HTTP_CLIENT_TIMEOUT"))
	if timeoutStr == "" {
		return
	}

	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil {
		log.Printf("parse %s error: %s, use default", timeoutStr, err.Error())
		return
	}

	HTTPClient.Timeout = time.Second * time.Duration(timeout)
}

func ParseHTTP(u string) (*url.URL, error) {
	return ParseURL(u, "http", "https")
}

func ParseURL(u string, scheme ...string) (*url.URL, error) {
	parseURL, err := url.Parse(u)
	if err != nil {
		return nil, err
	}

	if parseURL.Host == "" {
		return nil, errors.New("empty url host")
	}

	if parseURL.Scheme == "" {
		return nil, errors.New("empty url scheme")
	}

	if len(scheme) > 0 && !slices.Contains(scheme, parseURL.Scheme) {
		return nil, errors.New("invalid scheme")
	}

	return parseURL, nil
}
