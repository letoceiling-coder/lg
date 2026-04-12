#!/usr/bin/env bash
sudo -u postgres psql -d lg_production -c "
SELECT id, status, stats, error_message,
       started_at, finished_at
FROM import_batches
WHERE id = 10;
"
