#!/usr/bin/env bash
set -euo pipefail
# Выкладывает исправленный index.html и (опционально) nginx-конфиг на сервер.
# Запуск с локальной машины: bash deploy/fix-livegrid-public.sh user@host

REMOTE="${1:-root@85.198.64.93}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[fix] Upload public/index.html -> /var/www/lg/public/"
scp "$DIR/public/index.html" "$REMOTE:/var/www/lg/public/index.html"

echo "[fix] Upload nginx livegrid.ru.ssl.conf -> sites-available (adjust path if needed)"
scp "$DIR/livegrid.ru.ssl.conf" "$REMOTE:/tmp/livegrid.ru.ssl.conf"

ssh "$REMOTE" 'sudo cp /tmp/livegrid.ru.ssl.conf /etc/nginx/sites-available/livegrid.ru.ssl.conf && sudo nginx -t && sudo systemctl reload nginx && echo OK'

echo "[fix] Redis ping:"
ssh "$REMOTE" 'redis-cli ping || sudo systemctl start redis-server && redis-cli ping'

echo "[fix] Done. Open https://livegrid.ru/"
