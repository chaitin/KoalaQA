PLATFORM ?= linux/amd64
ARCH ?= amd64
VERSION ?= dev
COMMIT_HASH ?= $(shell git rev-parse HEAD)
BUILD_TIME ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')

image.api:
	cd backend && docker build \
		--build-arg VERSION=${VERSION} \
		--build-arg COMMIT_HASH=${COMMIT_HASH} \
		--build-arg BUILD_TIME=${BUILD_TIME} \
		--build-arg HTTP_PROXY=${HTTP_PROXY} \
		--build-arg HTTPS_PROXY=${HTTPS_PROXY} \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-api:latest .

image.app:
	cd ui && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-app:latest .

image.nginx:
	cd docker/nginx && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-nginx:latest .

image.mq:
	cd docker/mq && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-mq:latest .

image.oss:
	cd docker/oss && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-oss:latest .

image.db:
	cd docker/db && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-db:latest .

image.anydoc:
	cd docker/anydoc && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-anydoc:latest .

image.qdrant:
	cd docker/qdrant && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-qdrant:latest .
	
image.raglite:
	cd docker/raglite && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-raglite:latest .

image.all:
	make image.app
	make image.nginx
	make image.mq
	make image.api
	make image.oss
	make image.db
	make image.anydoc
	make image.qdrant
	make image.raglite

run.all:
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} image.all
	docker compose up -d

run:
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} image.app
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} image.api
	docker compose up -d

run.app:
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} image.app
	docker compose up -d