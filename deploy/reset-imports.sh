#!/usr/bin/env bash
set -euo pipefail
sudo -u postgres psql -d lg_production -c "UPDATE import_batches SET status='FAILED', finished_at=NOW(), error_message='Aborted: manual reset' WHERE status IN ('RUNNING','PENDING');"
echo "Done: import batches reset"
