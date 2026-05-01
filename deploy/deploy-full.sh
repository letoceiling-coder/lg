#!/usr/bin/env bash
set -euo pipefail

# ─── Полный деплой LiveGrid: API + фронт + nginx ───
# Запускать с сервера:   bash /var/www/lg/deploy/deploy-full.sh
# С обновлением из Git:  bash /var/www/lg/deploy/deploy-from-git.sh
# Или удалённо:          ssh root@HOST 'bash /var/www/lg/deploy/deploy-from-git.sh'

PROJECT_DIR="${DEPLOY_ROOT:-/var/www/lg}"
export DEPLOY_ROOT="$PROJECT_DIR"
LOG_DIR="/var/log/lg"
NGINX_CONF="/etc/nginx/sites-available/livegrid.ru.conf"
NGINX_LINK="/etc/nginx/sites-enabled/livegrid.ru.conf"
LEGACY_NGINX_LINK_1="/etc/nginx/sites-enabled/livegrid.ru"

echo "=== LiveGrid Full Deploy ==="
echo "Project: $PROJECT_DIR (DEPLOY_ROOT=$DEPLOY_ROOT)"
echo ""

cd "$PROJECT_DIR"

# shellcheck disable=SC1090
source "$PROJECT_DIR/deploy/load-api-env.sh"

# ── 1. Dependencies ──
echo "→ Installing dependencies..."
export CI=true
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── 2. Prisma generate ──
echo "→ Generating Prisma client..."
cd packages/database
pnpm exec prisma generate
cd "$PROJECT_DIR"

# ── 3. Prisma migrate (apply pending migrations) ──
echo "→ Applying DB migrations..."
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL не задан (нет .env и не удалось взять env из deploy/ecosystem.config.js)"
  exit 1
fi
cd packages/database
pnpm exec prisma migrate deploy
cd "$PROJECT_DIR"

# ── 4. Build API ──
echo "→ Building API..."
pnpm --filter @lg/api build

# ── 5. Build frontend ──
echo "→ Building frontend..."
# Remove stale hashed chunks so production checks and clients only see the current build.
rm -rf apps/web/dist
# Каноникал и prerender (sitemap, /complex/*/index.html) берут VITE_PUBLIC_SITE_URL или PUBLIC_SITE_URL
SITE_FOR_WEB="${VITE_PUBLIC_SITE_URL:-${PUBLIC_SITE_URL:-https://livegrid.ru}}"
SITE_FOR_WEB="${SITE_FOR_WEB%/}"
export VITE_PUBLIC_SITE_URL="$SITE_FOR_WEB"
pnpm build:web

# ── 6. Restart API via PM2 ──
echo "→ Restarting API (PM2)..."
mkdir -p "$LOG_DIR"
pm2 delete lg-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# ── 7. Update nginx config ──
echo "→ Updating nginx config..."
cp deploy/livegrid.ru.ssl.conf "$NGINX_CONF"

if [ ! -L "$NGINX_LINK" ]; then
  ln -s "$NGINX_CONF" "$NGINX_LINK"
fi
if [ -e "$LEGACY_NGINX_LINK_1" ] && [ "$LEGACY_NGINX_LINK_1" != "$NGINX_LINK" ]; then
  rm -f "$LEGACY_NGINX_LINK_1"
fi
for legacy in /etc/nginx/sites-enabled/*.livegrid.ru.conf; do
  [ -e "$legacy" ] || continue
  if [ "$legacy" != "$NGINX_LINK" ]; then
    rm -f "$legacy"
  fi
done

nginx -t && nginx -s reload
echo "  nginx reloaded OK"

# ── 8. Monitoring stack ──
echo "→ Starting monitoring stack (Prometheus + Grafana)..."
mkdir -p deploy/monitoring/secrets
printf '%s' "${METRICS_BEARER_TOKEN:-}" > deploy/monitoring/secrets/metrics_bearer.txt
chmod 600 deploy/monitoring/secrets/metrics_bearer.txt || true
if command -v docker >/dev/null 2>&1; then
  docker compose --profile monitoring up -d prometheus grafana || {
    echo "WARN: monitoring containers failed to start"
  }
else
  echo "WARN: docker is not installed; monitoring profile skipped"
fi

# ── 9. Verify ──
echo ""
echo "=== Deploy complete ==="
pm2 status
echo ""
echo "Health check:"
sleep 2
curl -s http://localhost:3000/api/v1/health | head -c 200
echo ""
echo ""

# Строгие проверки на сервере (только runtime: PM2 + curl к API)
if [ -f deploy/verify-on-server.sh ]; then
  echo "→ verify-on-server.sh runtime"
  VERIFY_MODE=runtime bash deploy/verify-on-server.sh runtime || exit 1
fi

echo "Frontend: https://livegrid.ru/"
