FROM nginx:1.28.0

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
COPY ssl /etc/nginx/ssl

ENV HTTP_PORT=80
ENV HTTPS_PORT=443

EXPOSE ${HTTP_PORT} ${HTTPS_PORT}

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]