# 第一阶段：下载 natscli
FROM alpine:3.22 AS builder
ARG NATS_CLI_VERSION=0.3.0
ARG TARGETARCH
RUN apk add --no-cache curl unzip \
    && curl -sL https://github.com/nats-io/natscli/releases/download/v${NATS_CLI_VERSION}/nats-${NATS_CLI_VERSION}-linux-${TARGETARCH}.zip -o /tmp/nats-cli.zip \
    && unzip /tmp/nats-cli.zip -d /tmp \
    && mv /tmp/nats-${NATS_CLI_VERSION}-linux-${TARGETARCH}/nats /usr/local/bin/nats \
    && chmod +x /usr/local/bin/nats

# 第二阶段：最终镜像
FROM nats:2.11.8-alpine3.22

# 从 builder 阶段复制 natscli 二进制文件
COPY --from=builder /usr/local/bin/nats /usr/local/bin/nats

COPY nats.conf /etc/nats/nats.conf

EXPOSE 4222
EXPOSE 8222

CMD ["nats-server", "-c", "/etc/nats/nats.conf"]