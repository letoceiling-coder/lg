#!/usr/bin/env bash
set -euo pipefail

# ─── Синхронизация проекта на сервер + полный деплой ───
# Запускать с локальной машины (откуда есть ssh-доступ к серверу)
# Перед запуском: pnpm build:web  (собрать фронт локально)

SERVER="root@85.198.64.93"
REMOTE_DIR="/var/www/lg"

echo "=== 1/2  Syncing project → $SERVER:$REMOTE_DIR ==="

ssh "$SERVER" "mkdir -p $REMOTE_DIR"

rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='TrendAgent' \
  --exclude='*.log' \
  --exclude='.env' \
  -e ssh \
  ./ "$SERVER:$REMOTE_DIR/"

echo ""
echo "=== 2/2  Running deploy on server ==="

ssh "$SERVER" "cd $REMOTE_DIR && bash deploy/deploy-full.sh"

echo ""
echo "=== Done! Site: https://lg.livegrid.ru/ ==="
