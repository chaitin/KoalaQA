FROM node:20-alpine AS base

ARG HTTPS_PROXY=${HTTPS_PROXY}
ARG HTTP_PROXY=${HTTP_PROXY}

ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV HTTP_PROXY=${HTTP_PROXY}

RUN npm config set strict-ssl false
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm --verbose

WORKDIR /app

COPY admin/package.json admin/pnpm-lock.yaml ./admin/
COPY front/package.json front/pnpm-lock.yaml ./front/

WORKDIR /app/admin
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

WORKDIR /app/front
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

WORKDIR /app
COPY admin/ ./admin/
COPY front/ ./front/

WORKDIR /app/admin
RUN pnpm build

WORKDIR /app/front
RUN pnpm build

FROM node:20-alpine AS production

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories

RUN apk update && apk add --no-cache nginx wget

COPY --from=base /app/admin/dist /var/www/admin

COPY --from=base /app/front/.next/standalone /app/front/
COPY --from=base /app/front/.next/static /app/front/.next/static
COPY --from=base /app/front/public /app/front/public

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN chown -R nginx:nginx /var/www/admin

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
