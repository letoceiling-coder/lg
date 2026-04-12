#!/usr/bin/env bash
# Подгружает DATABASE_URL и прочие переменные как у процесса lg-api (для Prisma CLI на сервере без .env).
# Использование:  source deploy/load-api-env.sh   (из корня репозитория)
set -euo pipefail
_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${DEPLOY_ROOT:-$(cd "$_script_dir/.." && pwd)}"
cd "$ROOT"
if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ROOT/.env"
  set +a
fi
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/deploy/ecosystem.config.js" ]; then
  eval "$(ROOT="$ROOT" node -e "
    const path = require('path');
    const root = process.env.ROOT;
    const cfg = require(path.join(root, 'deploy', 'ecosystem.config.js'));
    const env = cfg.apps && cfg.apps[0] && cfg.apps[0].env ? cfg.apps[0].env : {};
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined || v === null) continue;
      console.log('export ' + k + '=' + JSON.stringify(String(v)));
    }
  ")"
fi
