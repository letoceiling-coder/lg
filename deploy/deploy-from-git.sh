#!/usr/bin/env bash
set -euo pipefail

# ─── Деплой с обновлением кода из Git (стабильный сценарий для сервера) ───
# Первоначальная установка:
#   sudo mkdir -p /var/www && sudo chown "$USER" /var/www
#   git clone https://github.com/letoceiling-coder/lg.git /var/www/lg
#   cd /var/www/lg && bash deploy/deploy-from-git.sh
#
# Переменные:
#   DEPLOY_ROOT   — корень репозитория (по умолчанию /var/www/lg)
#   DEPLOY_BRANCH — ветка (по умолчанию main)
#   DEPLOY_REMOTE — remote (по умолчанию origin)

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/lg}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"

echo "=== LiveGrid deploy-from-git ==="
echo "Root: $DEPLOY_ROOT  branch: $DEPLOY_BRANCH  remote: $DEPLOY_REMOTE"
echo ""

if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  echo "ERROR: В $DEPLOY_ROOT нет репозитория Git."
  echo "Клонируйте проект: git clone <url> $DEPLOY_ROOT"
  exit 1
fi

cd "$DEPLOY_ROOT"

echo "→ git fetch $DEPLOY_REMOTE $DEPLOY_BRANCH"
git fetch "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"

echo "→ git checkout $DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"

echo "→ git pull (ff-only)"
if ! git pull --ff-only "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"; then
  echo "WARN: fast-forward невозможен. Выполняется обычный pull (разрешите конфликты вручную при необходимости)."
  git pull "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"
fi

echo "→ запуск deploy-full.sh"
exec bash "$DEPLOY_ROOT/deploy/deploy-full.sh"
