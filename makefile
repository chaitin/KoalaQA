PLATFORM ?= linux/amd64
ARCH ?= amd64
VERSION ?= dev
COMMIT_HASH ?= $(shell git rev-parse HEAD)
BUILD_TIME ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
IMG_TAG ?= $(shell grep -A 5 "^  app:" docker-compose.yml | grep "image:" | sed 's/.*://' | xargs)

image.api:
	cd backend && DOCKER_BUILDKIT=1 docker build \
		--build-arg VERSION=${VERSION} \
		--build-arg COMMIT_HASH=${COMMIT_HASH} \
		--build-arg BUILD_TIME=${BUILD_TIME} \
		--build-arg HTTP_PROXY=${HTTP_PROXY} \
		--build-arg HTTPS_PROXY=${HTTPS_PROXY} \
		-t swr.cn-east-3.myhuaweicloud.com/koala-qa/api:${IMG_TAG} .

image.app:
	cd ui && DOCKER_BUILDKIT=1 docker build \
		--build-arg HTTP_PROXY=${HTTP_PROXY} \
		--build-arg HTTPS_PROXY=${HTTPS_PROXY} \
		-t swr.cn-east-3.myhuaweicloud.com/koala-qa/app:${IMG_TAG} .

image.nginx:
	cd docker/nginx && DOCKER_BUILDKIT=1 docker build \
		-t swr.cn-east-3.myhuaweicloud.com/koala-qa/nginx:1.28.0 .

image.anydoc:
	cd docker/anydoc && DOCKER_BUILDKIT=1 docker build \
		-t swr.cn-east-3.myhuaweicloud.com/koala-qa/anydoc:v0.2.0 .

run: image.app image.api
	docker compose up -d

run.app: image.app
	docker compose up -d

run.api: image.api
	docker compose up -d