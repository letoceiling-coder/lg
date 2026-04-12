#!/usr/bin/env bash
set -euo pipefail

echo "=== Tables count ==="
sudo -u postgres psql -d lg_production -c "SELECT count(*) as tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"

echo "=== Feed Regions ==="
sudo -u postgres psql -d lg_production -c "SELECT code, name, is_enabled FROM feed_regions;"

echo "=== Users ==="
sudo -u postgres psql -d lg_production -c "SELECT email, role FROM users;"

echo "=== Site Settings (first 5) ==="
sudo -u postgres psql -d lg_production -c "SELECT key, value FROM site_settings ORDER BY id LIMIT 5;"

echo "=== Navigation Menus ==="
sudo -u postgres psql -d lg_production -c "SELECT location, label FROM navigation_menus;"
