ifneq (,$(wildcard .env))
    include .env
    export
endif

PLATFORM ?= linux/amd64
ARCH ?= amd64
VERSION ?= dev
COMMIT_HASH ?= $(shell git rev-parse HEAD)
BUILD_TIME ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
IMG_TAG ?= $(shell grep -A 5 "^  api:" docker-compose.yml | grep "image:" | sed 's/.*://' | xargs)

image.api:
	cd backend && DOCKER_BUILDKIT=1 docker build \
		--build-arg VERSION=${VERSION} \
		--build-arg COMMIT_HASH=${COMMIT_HASH} \
		--build-arg BUILD_TIME=${BUILD_TIME} \
		--build-arg HTTP_PROXY=${HTTP_PROXY} \
		--build-arg HTTPS_PROXY=${HTTPS_PROXY} \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/koalaqa/api:${IMG_TAG} .

image.app:
	cd ui && DOCKER_BUILDKIT=1 docker build \
		--build-arg HTTP_PROXY=${HTTP_PROXY} \
		--build-arg HTTPS_PROXY=${HTTPS_PROXY} \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/koalaqa/app:${IMG_TAG} .


image.raglite:
	cd docker/raglite && DOCKER_BUILDKIT=1 docker build \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/koalaqa/raglite:1-3-8 .

image.nginx:
	cd docker/nginx && DOCKER_BUILDKIT=1 docker build \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/koalaqa/nginx:1.28.0 .

image.anydoc:
	cd docker/anydoc && DOCKER_BUILDKIT=1 docker build \
		-t chaitin-registry.cn-hangzhou.cr.aliyuncs.com/koalaqa/anydoc:v0.6.2 .

run: image.app image.api
	docker compose up -d

run.app: image.app
	docker compose up -d

run.api: image.api
	docker compose up -d

swagger:
	cd backend && make swagger

tag:
	@VERSION=$(filter-out $@,$(MAKECMDGOALS)); \
	if [ -z "$$VERSION" ]; then \
		echo "Error: Please specify version tag, e.g.: make tag v1.0.0"; \
		exit 1; \
	fi; \
	if git tag -l | grep -q "^$$VERSION$$"; then \
		echo "Warning: Tag '$$VERSION' already exists"; \
		echo -n "Do you want to force overwrite this tag? (y/N): "; \
		read -r answer; \
		case $$answer in \
			[Yy]* ) \
				echo "Deleting existing tag..."; \
				git tag -d $$VERSION 2>/dev/null || true; \
				git push origin :refs/tags/$$VERSION 2>/dev/null || true; \
				echo "Creating new tag..."; \
				git tag $$VERSION && git push origin $$VERSION; \
				echo "Tag '$$VERSION' has been successfully overwritten"; \
				;; \
			* ) \
				echo "Operation cancelled"; \
				exit 1; \
				;; \
		esac; \
	else \
		echo "Creating tag '$$VERSION'..."; \
		git tag $$VERSION && git push origin $$VERSION; \
		echo "Tag '$$VERSION' has been successfully created"; \
	fi
%:
	@:
