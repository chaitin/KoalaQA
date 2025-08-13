package http

import (
	"crypto/tls"
	"net/http"
	"time"

	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Supply(&http.Client{
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
	}),
)
