#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/var/www/lg"
LOG_DIR="/var/log/lg"

echo "=== LiveGrid API Deploy ==="

# 1. Create directories
mkdir -p "$PROJECT_DIR" "$LOG_DIR"

# 2. Check Node.js
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Installing..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node: $(node --version)"

# 3. Install pnpm
if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
fi
echo "pnpm: $(pnpm --version)"

# 4. Install PM2
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo "PM2: $(pm2 --version)"

# 5. Install dependencies
cd "$PROJECT_DIR"
export CI=true
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 6. Generate Prisma client
cd packages/database
pnpm exec prisma generate
cd "$PROJECT_DIR"

# 7. Build API
cd apps/api
pnpm exec tsc --outDir dist --declaration --sourceMap
cd "$PROJECT_DIR"

# 8. Start/restart with PM2
pm2 delete lg-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save

# 9. Setup PM2 startup
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=== Deploy complete ==="
pm2 status
echo ""
echo "Test: curl http://localhost:3000/api/v1/health"
curl -s http://localhost:3000/api/v1/health | head -c 200
echo ""
