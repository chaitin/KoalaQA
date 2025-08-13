package util

import (
	"crypto/tls"
	"errors"
	"net/http"
	"net/url"
	"slices"
	"time"
)

var (
	HTTPClient = &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:    10,
			MaxConnsPerHost: 10,
			IdleConnTimeout: 30 * time.Second,
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
			Proxy: http.ProxyFromEnvironment,
		},
		Timeout: time.Second * 30,
	}
)

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
