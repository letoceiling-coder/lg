#!/usr/bin/env bash
set -euo pipefail
# Полный срез БД по региону (по умолчанию msk → region_id из feed_regions).
# Запуск на сервере:  bash /var/www/lg/deploy/audit-feed-db.sh
# Требует: psql, curl, jq

ROOT="${DEPLOY_ROOT:-/var/www/lg}"
CODE="${FEED_REGION_CODE:-msk}"

eval "$(cd "$ROOT" && ROOT="$ROOT" node -e "
  const path = require('path');
  const cfg = require(path.join(process.env.ROOT, 'deploy', 'ecosystem.config.js'));
  const env = (cfg.apps && cfg.apps[0] && cfg.apps[0].env) || {};
  for (const [k, v] of Object.entries(env)) {
    if (v == null || v === '') continue;
    console.log('export ' + k + '=' + JSON.stringify(String(v)));
  }
")"

export PGPASSWORD="${PGPASSWORD:-}"
DBURL="${DATABASE_URL:-}"
if [[ "$DBURL" != postgresql* ]]; then
  echo "ERROR: DATABASE_URL не задан (скопируйте .env на сервер или задайте вручную)."
  exit 1
fi

echo "=== LiveGrid audit feed + DB  region_code=$CODE ==="
echo ""

echo "→ TrendAgent about (exported_at, blocks URL)"
curl -sf --max-time 30 "https://dataout.trendagent.ru/${CODE}/about.json" \
  | jq -r '([.[] | select(.name=="blocks")][0]) // .[0] | "exported_at: \(.exported_at)\nblocks:    \(.url)"'

echo ""
echo "→ blocks.json length (фид, все записи ЖК в выгрузке)"
curl -sf --max-time 180 "https://dataout.trendagent.ru/${CODE}/blocks.json" | jq 'length'

echo ""
echo "→ feed_regions + region_id"
psql "$DBURL" -t -c "SELECT id, code, name FROM feed_regions WHERE lower(code) = lower('$CODE');"

RID=$(psql "$DBURL" -t -A -c "SELECT id FROM feed_regions WHERE lower(code) = lower('$CODE') LIMIT 1;" | tr -d '[:space:]')
if [[ -z "$RID" ]]; then
  echo "ERROR: регион $CODE не найден в feed_regions"
  exit 1
fi

echo ""
echo "→ blocks в БД (все ЖК региона)"
psql "$DBURL" -t -c "SELECT COUNT(*) AS blocks_all FROM blocks WHERE region_id = $RID;"

echo ""
echo "→ listings APARTMENT по статусу / публикации"
psql "$DBURL" -c "SELECT status::text, is_published, COUNT(*) AS n FROM listings WHERE region_id = $RID AND kind = 'APARTMENT' GROUP BY status, is_published ORDER BY n DESC;"

echo ""
echo "→ активные опубликованные квартиры: всего / с block_id / block_id IS NULL"
psql "$DBURL" -t -c "SELECT COUNT(*) FROM listings WHERE region_id = $RID AND kind = 'APARTMENT' AND status = 'ACTIVE' AND is_published = true;"
psql "$DBURL" -t -c "SELECT COUNT(*) FROM listings WHERE region_id = $RID AND kind = 'APARTMENT' AND status = 'ACTIVE' AND is_published = true AND block_id IS NOT NULL;"
psql "$DBURL" -t -c "SELECT COUNT(*) FROM listings WHERE region_id = $RID AND kind = 'APARTMENT' AND status = 'ACTIVE' AND is_published = true AND block_id IS NULL;"

echo ""
echo "→ уникальных ЖК с хотя бы одной активной опубликованной квартирой"
psql "$DBURL" -t -c "SELECT COUNT(DISTINCT block_id) FROM listings WHERE region_id = $RID AND kind = 'APARTMENT' AND status = 'ACTIVE' AND is_published = true AND block_id IS NOT NULL;"

echo ""
echo "→ последний успешный import_batch (stats)"
psql "$DBURL" -c "SELECT id, status, finished_at, stats::text FROM import_batches WHERE region_id = $RID AND status = 'COMPLETED' ORDER BY finished_at DESC LIMIT 1;"

echo ""
echo "→ GET catalog-counts (как главная; region_id=$RID)"
curl -sf --max-time 15 "http://127.0.0.1:3000/api/v1/blocks/catalog-counts?region_id=$RID" || echo "(API недоступен на :3000)"

echo ""
echo "=== Пояснение ==="
echo "Счётчик главной (catalog-counts) = активные опубликованные квартиры, у которых block_id задан, и только ЖК с такими лотами."
echo "Во фиде blocks.json ~1308 строк ЖК; в БД столько же blocks — это весь справочник ЖК, а не число «464» на сайте TrendAgent (у них другой срез по офферам)."
echo "Если ACTIVE+published всего 61899, а на главной 45617 — разница почти всегда в лотах с block_id IS NULL (остальные не попадают в «квартир в N ЖК»)."
echo "Сравнение с 66k/464 на msk.trendagent.ru: другая дата снимка/агрегация; у нас свежий импорт и свои ошибки upsert (см. stats.errors в import_batches)."
