FROM golang:1.25-alpine AS build

WORKDIR /app

ARG VERSION="dev"
ARG COMMIT_HASH="unknown"
ARG BUILD_TIME="unknown"
ARG HTTP_PROXY=${HTTP_PROXY}
ARG HTTPS_PROXY=${HTTPS_PROXY}

ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV GOPROXY=https://goproxy.cn,direct

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build \
    -ldflags "-s -w -extldflags -static \
    -X 'main.Version=${VERSION}' \
    -X 'main.GitCommit=${COMMIT_HASH}' \
    -X 'main.BuildTime=${BUILD_TIME}'" \
    -o koala-qa-app cmd/server/main.go

FROM alpine:3.22

# RUN apk update && apk add --no-cache tzdata curl bash && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=build /app/koala-qa-app ./koala-qa-app

EXPOSE 8080

CMD ["/app/koala-qa-app"]