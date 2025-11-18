# RAGLite PostgreSQL with zhparser (Chinese Full-Text Search)
ARG PG_VERSION=17.6

FROM postgres:${PG_VERSION}-bookworm AS builder

ARG DEBIAN_FRONTEND=noninteractive

# 安装构建依赖
RUN set -ex \
    && apt-get update \
    && apt-get install -y \
        build-essential \
        git \
        postgresql-server-dev-${PG_MAJOR} \
        pkg-config \
        binutils \
        automake \
        libtool \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 编译安装 SCWS
RUN set -ex \
    && git clone --branch 1.2.3 --single-branch --depth 1 https://github.com/hightman/scws.git \
    && cd scws \
    && touch README \
    && aclocal \
    && autoconf \
    && autoheader \
    && libtoolize \
    && automake --add-missing \
    && ./configure \
    && make install \
    && cd .. \
    && rm -rf scws

# 编译安装 zhparser
RUN set -ex \
    && git clone --branch master --single-branch --depth 1 https://github.com/amutu/zhparser.git \
    && cd zhparser \
    && make install \
    && cd .. \
    && rm -rf zhparser

# 最终镜像
FROM postgres:${PG_VERSION}-bookworm

# 配置中文语言环境
RUN apt-get update \
    && apt-get install -y locales \
    && localedef -i zh_CN -c -f UTF-8 -A /usr/share/locale/locale.alias zh_CN.UTF-8 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制文件
COPY --from=builder /usr/lib/postgresql/${PG_MAJOR}/lib/zhparser.so /usr/lib/postgresql/${PG_MAJOR}/lib/
COPY --from=builder /usr/local/lib/libscws.* /usr/local/lib/
COPY --from=builder /usr/share/postgresql/${PG_MAJOR}/extension/zhparser* /usr/share/postgresql/${PG_MAJOR}/extension/
COPY --from=builder /usr/lib/postgresql/${PG_MAJOR}/lib/bitcode/zhparser* /usr/lib/postgresql/${PG_MAJOR}/lib/bitcode/
COPY --from=builder /usr/share/postgresql/${PG_MAJOR}/tsearch_data/*.utf8.* /usr/share/postgresql/${PG_MAJOR}/tsearch_data/

RUN ldconfig

EXPOSE 5432
