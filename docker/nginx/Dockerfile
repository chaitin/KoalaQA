FROM nginx:1.28.0

# 备份默认配置
RUN mkdir -p /usr/share/nginx/conf-default && \
    cp -r /etc/nginx/* /usr/share/nginx/conf-default/

# 复制配置文件和证书
COPY nginx.conf.template /usr/share/nginx/conf-default/nginx.conf.template
COPY ssl/ /usr/share/nginx/conf-default/ssl/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV HTTP_PORT=80 HTTPS_PORT=443

EXPOSE ${HTTP_PORT} ${HTTPS_PORT}

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]