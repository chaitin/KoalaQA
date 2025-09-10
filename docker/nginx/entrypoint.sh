#!/bin/bash
set -e

envsubst '${HTTP_PORT} ${HTTPS_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec "$@"
