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
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-api:${TAG} .

image.app:
	cd ui && docker build -t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/koala-qa-app:${TAG} .

run:
	$(eval APP_TAG := $(shell grep -A 5 "^  app:" docker-compose.yml | grep "image:" | sed 's/.*://' | xargs))
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} TAG=${APP_TAG} image.app
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} TAG=${APP_TAG} image.api
	docker compose up -d

run.app:
	$(eval APP_TAG := $(shell grep -A 5 "^  app:" docker-compose.yml | grep "image:" | sed 's/.*://' | xargs))
	make -e HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} TAG=${APP_TAG} image.app
	docker compose up -d