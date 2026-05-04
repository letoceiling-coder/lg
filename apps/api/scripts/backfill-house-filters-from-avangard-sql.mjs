#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Бэкап полей фильтров домов из дампа MySQL Авангарда (DB.sql) в LiveGrid по связке Listing.external_id = donor:<number>.
 *
 * Берётся object='Дом': район (adressrayon → district_name как «… район»), населённый пункт,
 * улица, синонимы, расстояние до города (км), флаги направлений (south/north/east/west),
 * признаки области/района по полям region/district, горячее (hot), материал, площадь участка.
 *
 * Usage:
 *   cd apps/api
 *   DATABASE_URL='postgresql://...' node scripts/backfill-house-filters-from-avangard-sql.mjs "C:/path/to/DB.sql"
 *
 * Переменные:
 *   REGION_CODE=belgorod   (по умолчанию belgorod)
 *   DRY_RUN=1              только лог, без записи в БД
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REGION_CODE = process.env.REGION_CODE ?? 'belgorod';
const DRY = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

/** Индексы полей таблицы objects (0-based), см. дамп DB.sql */
const IDX = {
  number: 0,
  material: 7,
  sqlive: 9,
  adressrayon: 12,
  adressgorod: 13,
  adressulica: 14,
  adressdom: 15,
  comments: 17,
  hot: 18,
  squchastok: 26,
  rasstoyanie: 30,
  south: 35,
  north: 36,
  east: 37,
  west: 38,
  regionFlag: 39,
  districtFlag: 40,
  sinonim: 41,
};

function decodeCp1251(buf) {
  try {
    return new TextDecoder('windows-1251', { fatal: false }).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

/** Разбор одной строки кортежа MySQL без внешних скобок. */
function splitMysqlTuple(tuple) {
  const out = [];
  let i = 0;
  let cur = '';
  let inQuote = false;

  while (i < tuple.length) {
    const c = tuple[i];
    if (inQuote) {
      if (c === '\\' && i + 1 < tuple.length) {
        cur += tuple[i + 1];
        i += 2;
        continue;
      }
      if (c === "'" && tuple[i + 1] === "'") {
        cur += "'";
        i += 2;
        continue;
      }
      if (c === "'") {
        inQuote = false;
        out.push(cur);
        cur = '';
        i++;
        while (tuple[i] === ' ' || tuple[i] === '\t' || tuple[i] === '\r' || tuple[i] === '\n') i++;
        if (tuple[i] === ',') i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      i++;
      continue;
    }
    if (c === "'") {
      inQuote = true;
      cur = '';
      i++;
      continue;
    }
    if (c === ',') {
      out.push(normalizeScalar(cur.trim()));
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) out.push(normalizeScalar(cur.trim()));
  return out;
}

function normalizeScalar(s) {
  if (s === 'NULL' || s === '') return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

function extractHouseTuples(sql) {
  const tuples = [];
  const needle = "'Дом', 'Продажа'";
  let pos = 0;
  while (pos < sql.length) {
    const mi = sql.indexOf(needle, pos);
    if (mi === -1) break;
    let s = mi;
    while (s >= 0 && sql[s] !== '(') s--;
    if (sql[s] !== '(') {
      pos = mi + needle.length;
      continue;
    }
    let depth = 0;
    let i = s;
    let inStr = false;
    let esc = false;
    for (; i < sql.length; i++) {
      const ch = sql[i];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === '\\') {
          esc = true;
          continue;
        }
        if (ch === "'" && sql[i + 1] === "'") {
          i++;
          continue;
        }
        if (ch === "'") {
          inStr = false;
          continue;
        }
        continue;
      }
      if (ch === "'") {
        inStr = true;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          tuples.push(sql.slice(s + 1, i));
          pos = i + 1;
          break;
        }
      }
    }
    if (depth !== 0) pos = mi + needle.length;
  }
  return tuples;
}

function str(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function normalizeDistrictName(raw) {
  const t = str(raw);
  if (!t) return null;
  let x = t.replace(/^ГО\s+/i, '').replace(/^(г\.?\s*)/i, '').trim();
  if (!x) return null;
  if (/район$/i.test(x)) return x;
  return `${x} район`;
}

function truthyInt(v) {
  if (v == null || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0;
}

async function main() {
  const fileArg = process.argv.find((a) => !a.startsWith('-') && a.endsWith('.sql'));
  if (!fileArg) {
    console.error('Укажите путь к DB.sql');
    process.exit(1);
  }
  const abs = resolve(fileArg);
  const sql = decodeCp1251(readFileSync(abs));
  const tuples = extractHouseTuples(sql);
  console.log(`Найдено кортежей «Дом / Продажа»: ${tuples.length}`);

  const region = await prisma.feedRegion.findUnique({
    where: { code: REGION_CODE },
    select: { id: true },
  });
  if (!region) {
    console.error(`Регион с code=${REGION_CODE} не найден`);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const t of tuples) {
    const fields = splitMysqlTuple(t);
    if (fields.length < 42) {
      skipped++;
      continue;
    }
    const num = fields[IDX.number];
    if (typeof num !== 'number') {
      skipped++;
      continue;
    }
    const externalId = `donor:${num}`;

    const listing = await prisma.listing.findUnique({
      where: { regionId_externalId: { regionId: region.id, externalId } },
      select: { id: true, kind: true },
    });
    if (!listing || listing.kind !== 'HOUSE') {
      missing++;
      continue;
    }

    const dist = fields[IDX.rasstoyanie];
    const distanceToCity =
      dist != null && typeof dist === 'number' && dist > 0 ? dist : null;

    const patch = {
      material: str(fields[IDX.material]),
      districtName: normalizeDistrictName(fields[IDX.adressrayon]),
      settlement: str(fields[IDX.adressgorod]),
      street: str(fields[IDX.adressulica]),
      houseNumber: str(fields[IDX.adressdom]),
      synonyms: str(fields[IDX.sinonim]),
      distanceToCity,
      directionSouth: truthyInt(fields[IDX.south]),
      directionNorth: truthyInt(fields[IDX.north]),
      directionEast: truthyInt(fields[IDX.east]),
      directionWest: truthyInt(fields[IDX.west]),
      inBelgorodRegion: truthyInt(fields[IDX.regionFlag]),
      inBelgorodDistrict: truthyInt(fields[IDX.districtFlag]),
      areaLiving:
        typeof fields[IDX.sqlive] === 'number' && fields[IDX.sqlive] > 0
          ? new Prisma.Decimal(fields[IDX.sqlive])
          : undefined,
      areaLand:
        typeof fields[IDX.squchastok] === 'number' && fields[IDX.squchastok] > 0
          ? new Prisma.Decimal(fields[IDX.squchastok])
          : undefined,
    };

    const hotRaw = fields[IDX.hot];
    const listingPatch = { isHot: truthyInt(hotRaw) };

    if (!DRY) {
      await prisma.listingHouse.update({
        where: { listingId: listing.id },
        data: patch,
      });
      await prisma.listing.update({
        where: { id: listing.id },
        data: listingPatch,
      });
    }
    updated++;
  }

  console.log(
    DRY
      ? `[DRY_RUN] обновило бы HOUSE: ${updated}, нет в БД: ${missing}, битых кортежей: ${skipped}`
      : `Готово. Обновлено: ${updated}, нет записи donor:* в регионе: ${missing}, битых кортежей: ${skipped}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
