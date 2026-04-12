#!/usr/bin/env bash
set -euo pipefail

# Первичная установка на сервере: клон репозитория в DEPLOY_ROOT → deploy-from-git.
#   curl -sSL … | bash   или вручную:
#   bash deploy/bootstrap-server.sh
#
# Переменные:
#   DEPLOY_ROOT  — каталог проекта (по умолчанию /var/www/lg)
#   LG_REPO_URL  — git URL (по умолчанию публичный GitHub)
#   DEPLOY_BRANCH — ветка (main)

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/lg}"
export DEPLOY_ROOT
LG_REPO_URL="${LG_REPO_URL:-https://github.com/letoceiling-coder/lg.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "=== LiveGrid bootstrap-server ==="
echo "DEPLOY_ROOT=$DEPLOY_ROOT  branch=$DEPLOY_BRANCH"
echo ""

if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  parent="$(dirname "$DEPLOY_ROOT")"
  mkdir -p "$parent"
  if [ -e "$DEPLOY_ROOT" ] && [ -n "$(ls -A "$DEPLOY_ROOT" 2>/dev/null)" ]; then
    bak="${DEPLOY_ROOT}.pre-git-$(date +%Y%m%d%H%M%S)"
    echo "→ каталог не пустой и без Git — перенос в $bak"
    mv "$DEPLOY_ROOT" "$bak"
    mkdir -p "$DEPLOY_ROOT"
    if [ -f "$bak/.env" ]; then
      cp -a "$bak/.env" "$DEPLOY_ROOT/.env" && echo "  (скопирован .env из резервной копии)"
    fi
  fi
  echo "→ git clone $LG_REPO_URL → $DEPLOY_ROOT"
  git clone -b "$DEPLOY_BRANCH" "$LG_REPO_URL" "$DEPLOY_ROOT"
else
  echo "→ репозиторий уже есть: $DEPLOY_ROOT"
fi

exec bash "$DEPLOY_ROOT/deploy/deploy-from-git.sh"
