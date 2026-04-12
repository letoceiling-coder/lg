#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/var/log/lg/cron-feed-import.log"
API="http://localhost:3000/api/v1"

echo "$(date '+%Y-%m-%d %H:%M:%S') === Cron feed import started ===" >> "$LOG_FILE"

# Login
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@livegrid.ru","password":"admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Failed to get token" >> "$LOG_FILE"
  exit 1
fi

# Reset any stuck imports
sudo -u postgres psql -d lg_production -c \
  "UPDATE import_batches SET status='FAILED', finished_at=NOW(), error_message='Cron auto-reset' WHERE status IN ('RUNNING','PENDING');" \
  >> "$LOG_FILE" 2>&1 || true

# Trigger import
RESULT=$(curl -sf -X POST "$API/admin/feed-import/trigger?region=msk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$(date '+%Y-%m-%d %H:%M:%S') Import triggered: $RESULT" >> "$LOG_FILE"
