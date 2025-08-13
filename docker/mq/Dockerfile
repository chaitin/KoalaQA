FROM nats:2.11.8-alpine3.22

COPY nats.conf /etc/nats/nats.conf

EXPOSE 4222
EXPOSE 8222

CMD ["nats-server", "-c", "/etc/nats/nats.conf"]