#!/usr/bin/env bash
set -euo pipefail

SERVER="root@85.198.64.93"
REMOTE_DIR="/var/www/lg"

echo "=== Syncing project to server ==="

ssh "$SERVER" "mkdir -p $REMOTE_DIR"

rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='TrendAgent' \
  --exclude='*.log' \
  --exclude='.env' \
  -e ssh \
  ./ "$SERVER:$REMOTE_DIR/"

echo "=== Sync complete ==="
