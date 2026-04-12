#!/usr/bin/env bash
# Строгие проверки только на сервере (из /var/www/lg).
#   bash deploy/verify-on-server.sh          # полный цикл (по умолчанию)
#   bash deploy/verify-on-server.sh full      # то же
#   bash deploy/verify-on-server.sh runtime   # только PM2 + HTTP к API (после деплоя)
#
# Переменные: VERIFY_MODE=full|runtime — как первый аргумент.
set -euo pipefail

ROOT="${PROJECT_DIR:-/var/www/lg}"
cd "$ROOT"
export CI=true
export DEPLOY_ROOT="$ROOT"

# shellcheck disable=SC1090
source "$ROOT/deploy/load-api-env.sh"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL не задан (.env отсутствует и не удалось взять env из ecosystem.config.js)"
  exit 1
fi

MODE="${1:-${VERIFY_MODE:-full}}"

runtime_checks() {
  echo "=== Runtime: PM2 + localhost API ==="
  pm2 describe lg-api >/dev/null 2>&1 || {
    echo "ERROR: pm2 process lg-api not found"
    exit 1
  }
  local h
  h="$(curl -sf --max-time 15 "http://127.0.0.1:3000/api/v1/health")"
  echo "$h" | head -c 300
  echo ""
  echo "$h" | grep -q '"status":"ok"' || {
    echo "ERROR: health JSON missing status ok"
    exit 1
  }

  echo "=== POST /api/v1/requests (smoke) ==="
  local resp
  resp="$(curl -sf --max-time 15 -X POST "http://127.0.0.1:3000/api/v1/requests" \
    -H "Content-Type: application/json" \
    -d '{"name":"ServerVerify","phone":"+79990009900","type":"CONSULTATION","comment":"verify-on-server.sh runtime"}')"
  echo "$resp" | head -c 400
  echo ""
  echo "$resp" | grep -q '"id":' || {
    echo "ERROR: POST requests did not return id"
    exit 1
  }

  echo "=== GET catalog-counts ==="
  local cc
  cc="$(curl -sf --max-time 15 "http://127.0.0.1:3000/api/v1/blocks/catalog-counts?region_id=1")"
  echo "$cc"
  echo "$cc" | grep -q '"blocks":' || {
    echo "ERROR: catalog-counts invalid"
    exit 1
  }
}

if [ "$MODE" = "runtime" ]; then
  runtime_checks
  echo ""
  echo "=== VERIFY runtime: OK ==="
  exit 0
fi

if [ "$MODE" != "full" ]; then
  echo "Usage: $0 [full|runtime]"
  exit 2
fi

echo "=== FULL verify (install + prisma + typecheck + build + nginx + runtime) ==="

echo "→ pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "→ prisma generate"
( cd "$ROOT/packages/database" && pnpm exec prisma generate )

echo "→ prisma migrate deploy"
( cd "$ROOT/packages/database" && pnpm exec prisma migrate deploy )

echo "→ pnpm typecheck"
pnpm typecheck

echo "→ build API"
pnpm --filter @lg/api build

echo "→ build web"
pnpm build:web

echo "→ nginx -t"
nginx -t

runtime_checks

echo ""
echo "=== VERIFY full: OK ==="
