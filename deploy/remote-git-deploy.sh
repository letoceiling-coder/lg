#!/usr/bin/env bash
set -euo pipefail

# Запуск с локальной машины (Linux/macOS/Git Bash): обновление с Git + деплой на сервере.
#   bash deploy/remote-git-deploy.sh
#
# Переменные:
#   LG_SSH       — ssh target (по умолчанию root@85.198.64.93)
#   DEPLOY_ROOT  — путь на сервере (по умолчанию /var/www/lg)
#   DEPLOY_BRANCH — ветка (main)

LG_SSH="${LG_SSH:-root@85.198.64.93}"
REMOTE_DIR="${DEPLOY_ROOT:-/var/www/lg}"
BRANCH="${DEPLOY_BRANCH:-main}"
REPO="${LG_REPO_URL:-https://github.com/letoceiling-coder/lg.git}"

echo "=== remote-git-deploy → $LG_SSH  DEPLOY_ROOT=$REMOTE_DIR ==="

ssh -o BatchMode=yes -o ConnectTimeout=20 "$LG_SSH" "export DEPLOY_ROOT=$(printf %q "$REMOTE_DIR") DEPLOY_BRANCH=$(printf %q "$BRANCH") LG_REPO_URL=$(printf %q "$REPO"); bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
export DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/lg}"
export DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
export LG_REPO_URL="${LG_REPO_URL:-https://github.com/letoceiling-coder/lg.git}"
if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  mkdir -p "$(dirname "$DEPLOY_ROOT")"
  if [ -e "$DEPLOY_ROOT" ] && [ -n "$(ls -A "$DEPLOY_ROOT" 2>/dev/null)" ]; then
    bak="${DEPLOY_ROOT}.pre-git-$(date +%Y%m%d%H%M%S)"
    echo "→ нет .git, непустой каталог — архив: $bak"
    mv "$DEPLOY_ROOT" "$bak"
    mkdir -p "$DEPLOY_ROOT"
    [ -f "$bak/.env" ] && cp -a "$bak/.env" "$DEPLOY_ROOT/.env" && echo "  (.env восстановлен)"
  fi
  echo "→ git clone → $DEPLOY_ROOT"
  git clone -b "$DEPLOY_BRANCH" "$LG_REPO_URL" "$DEPLOY_ROOT"
fi
bash "$DEPLOY_ROOT/deploy/deploy-from-git.sh"
REMOTE_SCRIPT

echo "=== remote-git-deploy: OK ==="
