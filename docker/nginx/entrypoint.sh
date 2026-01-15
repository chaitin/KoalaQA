#!/bin/bash
set -e

# 初始化 nginx 配置目录（仅首次启动时）
if [ ! -f /etc/nginx/mime.types ]; then
    echo "Initializing nginx configuration directory..."
    
    # 从备份恢复默认配置
    if [ -d /usr/share/nginx/conf-default ]; then
        cp -r /usr/share/nginx/conf-default/* /etc/nginx/
        
        # 生成 nginx.conf
        if [ -f /etc/nginx/nginx.conf.template ]; then
            envsubst '${HTTP_PORT} ${HTTPS_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
        fi
        
        echo "Configuration directory initialized."
    fi
fi

exec "$@"
