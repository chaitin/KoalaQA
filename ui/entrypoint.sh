#!/bin/sh

PORT=${PORT:-3000}
NODE_ENV=${NODE_ENV:-production}
TARGET=${TARGET:-http://koala-qa-api:8080}

echo "  PORT: $PORT"
echo "  HOSTNAME: 0.0.0.0"
echo "  NODE_ENV: $NODE_ENV"
echo "  TARGET: $TARGET"

echo "start Next.js front application..."
cd /app/front
export PORT=$PORT
export NODE_ENV=$NODE_ENV
export TARGET=$TARGET
export NEXT_DEBUG=true
export HOSTNAME=0.0.0.0
node server.js 2>&1 | sed 's/^/[NextJS] /' &
NEXTJS_PID=$!

echo "wait Next.js start..."
sleep 5

if ! kill -0 $NEXTJS_PID 2>/dev/null; then
    echo "error: Next.js start failed"
    exit 1
fi

echo "start Nginx..."
nginx -g 'daemon off;' 2>&1 | sed 's/^/[Nginx] /' &
NGINX_PID=$!

cleanup() {
    echo "receive stop signal, shutting down services..."
    kill $NEXTJS_PID 2>/dev/null
    kill $NGINX_PID 2>/dev/null
    wait $NEXTJS_PID 2>/dev/null
    wait $NGINX_PID 2>/dev/null
    echo "all services stopped"
    exit 0
}

trap cleanup TERM INT QUIT

echo "all services started!"
echo "access instructions:"
echo "  front application (Next.js): http://localhost/"
echo "  admin application (React): http://localhost/admin"
echo "  health check: http://localhost/health"
echo ""

while true; do
    if ! kill -0 $NEXTJS_PID 2>/dev/null; then
        echo "error: Next.js process exited unexpectedly"
        kill $NGINX_PID 2>/dev/null
        exit 1
    fi
    
    if ! kill -0 $NGINX_PID 2>/dev/null; then
        echo "error: Nginx process exited unexpectedly"
        kill $NEXTJS_PID 2>/dev/null
        exit 1
    fi
    
    sleep 10
done
