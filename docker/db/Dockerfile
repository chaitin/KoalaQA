FROM postgres:17.6-alpine3.22

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD pg_isready -U koala -d koala || exit 1
