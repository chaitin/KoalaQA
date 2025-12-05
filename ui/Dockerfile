FROM node:20-alpine AS base

ARG HTTPS_PROXY=${HTTPS_PROXY}
ARG HTTP_PROXY=${HTTP_PROXY}

ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV HTTP_PROXY=${HTTP_PROXY}

RUN npm config set strict-ssl false
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm --verbose

# Admin 构建阶段
FROM base AS admin-builder

WORKDIR /app/admin

COPY admin/package.json admin/pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

COPY admin/ ./

RUN pnpm build

# Front 构建阶段
FROM base AS front-builder

WORKDIR /app/front

COPY front/package.json front/pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

COPY front/ ./

RUN pnpm build

FROM node:20-alpine AS production

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories

RUN apk update --no-cache && apk add --no-cache nginx wget tzdata

COPY --from=admin-builder /app/admin/dist /var/www/admin

COPY --from=front-builder /app/front/.next/standalone /app/front/
COPY --from=front-builder /app/front/.next/static /app/front/.next/static
COPY --from=front-builder /app/front/public /app/front/public

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R nginx:nginx /var/www/admin

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
