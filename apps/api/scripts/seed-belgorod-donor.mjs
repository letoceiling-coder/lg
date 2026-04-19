#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed Belgorod donor: scrape avangard31.ru catalogue and insert into LiveGrid DB.
 *
 * What it does:
 *  - Ensures FeedRegion code='belgorod' exists.
 *  - Ensures MediaFolder "Авангард Белгород" exists at root.
 *  - For each section (kvartiry/doma/dachi/uchastki/pomescheniya):
 *      - Iterates pages until no new IDs are found.
 *      - Skips already imported IDs (Listing.externalId='donor:<id>').
 *      - Fetches detail page, parses title/price/address/photos/description/table.
 *      - Downloads each photo to MEDIA_ROOT/media/<uuid>.jpg, creates MediaFile row,
 *        and links it to the Listing via entityType='listing'.
 *      - Creates Listing + kind-specific subentity (apartment/house/land/commercial).
 *
 * Usage on the server:
 *   cd /var/www/lg/apps/api
 *   DATABASE_URL='postgresql://...' MEDIA_ROOT=/var/www/lg/uploads node scripts/seed-belgorod-donor.mjs
 *
 * Re-run is safe — already imported IDs are skipped.
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient, Prisma } from '@prisma/client';

const DONOR_BASE = 'https://xn--31-6kcaakij2f6a.xn--p1ai';
const REGION_CODE = 'belgorod';
const REGION_NAME = 'Белгород';
const FOLDER_NAME = 'Авангард Белгород';
const PUBLIC_PREFIX = '/uploads/media/';
const MEDIA_ROOT = process.env.MEDIA_ROOT ?? '/var/www/lg/uploads';
const MEDIA_DIR = join(MEDIA_ROOT, 'media');
const HTTP_TIMEOUT_MS = 30000;
const PHOTO_TIMEOUT_MS = 25000;
const SECTION_PAGE_LIMIT = 100;
const REQUEST_DELAY_MS = 200;

const SECTIONS = [
  { code: 'kvartiry', kind: 'APARTMENT' },
  { code: 'doma', kind: 'HOUSE' },
  { code: 'dachi', kind: 'HOUSE' },
  { code: 'uchastki', kind: 'LAND' },
  { code: 'pomescheniya', kind: 'COMMERCIAL' },
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; LiveGrid-Importer/1.0; +https://livegrid.ru)',
  Accept: 'text/html,application/xhtml+xml',
};

const prisma = new PrismaClient();

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&laquo;?/g, '«')
    .replace(/&raquo;?/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html) {
  if (!html) return '';
  return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

async function fetchHtml(url, attempt = 0) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } catch (e) {
    if (attempt < 2) {
      await sleep(800 * (attempt + 1));
      return fetchHtml(url, attempt + 1);
    }
    console.warn(`[fetch] ${url} failed: ${e.message}`);
    return null;
  }
}

async function downloadBuffer(url, attempt = 0) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PHOTO_TIMEOUT_MS);
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (e) {
    if (attempt < 1) {
      await sleep(500);
      return downloadBuffer(url, attempt + 1);
    }
    return null;
  }
}

function extractIdsFromCatalog(html) {
  if (!html) return [];
  const main = html.split("<div class='rightcol'>")[0] ?? html;
  const ids = new Set();
  const re = /object\.php\?number=(\d+)/g;
  let m;
  while ((m = re.exec(main))) ids.add(Number(m[1]));
  return [...ids];
}

function extractTotalPages(html) {
  if (!html) return 1;
  const ids = new Set();
  const re = /catalog\.php\?object=[\w]+&page=(\d+)/g;
  let m;
  while ((m = re.exec(html))) ids.add(Number(m[1]));
  if (!ids.size) return 1;
  return Math.max(...ids);
}

function parseDetail(html, donorId) {
  if (!html) return null;
  const main = html.split("<div class='rightcol'>")[0] ?? html;

  const titleMatch = main.match(/<h1 class='nametext'>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? stripTags(titleMatch[1]) : null;

  const priceMatch = main.match(/<div class='priceblock'>([\s\S]*?)<\/div>/);
  let price = null;
  if (priceMatch) {
    const digits = priceMatch[1].replace(/<[^>]+>/g, '').replace(/\D+/g, '');
    if (digits) price = Number(digits);
  }

  // Address: first <p> after priceblock
  let address = null;
  if (priceMatch) {
    const after = main.slice((priceMatch.index ?? 0) + priceMatch[0].length);
    const addrMatch = after.match(/<p>([\s\S]*?)<\/p>/);
    if (addrMatch) address = stripTags(addrMatch[1]);
  }

  // Photos: only large-size from .slider-for
  const photoUrls = new Set();
  const photoRe = /href="(\.\/img\/photo\/\d+\/[^"'\s]+\.(?:jpg|jpeg|png|webp))"/gi;
  let pm;
  while ((pm = photoRe.exec(main))) {
    const u = pm[1].replace(/^\.\//, '/');
    // Skip thumbnails (start with p-)
    if (/\/p-\d+/.test(u)) continue;
    photoUrls.add(`${DONOR_BASE}${u}`);
  }

  // Table key/value pairs
  const props = {};
  const tableMatch = main.match(/<table class='objtablenew'>([\s\S]*?)<\/table>/);
  if (tableMatch) {
    const tdRe = /<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g;
    let tm;
    while ((tm = tdRe.exec(tableMatch[1]))) {
      const k = stripTags(tm[1]).replace(/[:\s]+$/, '');
      const v = stripTags(tm[2]);
      if (k) props[k] = v;
    }
  }

  // Description: first <br><p>...</p> after the </table>
  let description = null;
  if (tableMatch) {
    const after = main.slice((tableMatch.index ?? 0) + tableMatch[0].length);
    const descMatch = after.match(/<br>\s*<p>([\s\S]*?)<\/p>/);
    if (descMatch) description = stripTags(descMatch[1]);
  } else {
    // Some sections (uchastki, dachi, pomescheniya) may not have the table
    const altMatch = main.match(/<\/p>\s*<\/div>\s*<br>\s*<p>([\s\S]*?)<\/p>/);
    if (altMatch) description = stripTags(altMatch[1]);
  }

  return {
    donorId,
    title,
    price,
    address,
    description,
    photoUrls: [...photoUrls],
    props,
  };
}

function parseAreaTotal(props) {
  // "40/17/11 м2" → 40
  const v = props['Площадь'] || props['Общая площадь'] || props['Площадь дома'];
  if (!v) return null;
  const m = v.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

function parseAreaKitchen(props) {
  const v = props['Площадь'] || '';
  // For "40/17/11" — 11 is kitchen
  const parts = v.split(/[\/\s]/).filter(Boolean);
  if (parts.length >= 3) {
    const n = Number(parts[2].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseFloorAndTotal(props) {
  const v = props['Этажность'] || props['Этаж'];
  if (!v) return { floor: null, floorsTotal: null };
  const m = v.match(/(\d+)\s*\/\s*(\d+)/);
  if (m) return { floor: Number(m[1]), floorsTotal: Number(m[2]) };
  const m2 = v.match(/(\d+)/);
  return { floor: m2 ? Number(m2[1]) : null, floorsTotal: null };
}

function parseRoomsCount(title) {
  if (!title) return null;
  const m = title.match(/(\d+)-комнат/i);
  return m ? Number(m[1]) : null;
}

function parseLandSotki(props) {
  // "10 соток" or "10"
  const v = props['Площадь участка'] || props['Площадь'] || '';
  const m = v.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : null;
}

function parseYearBuilt(props) {
  const v = props['Год постройки'];
  if (!v) return null;
  const m = v.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function ext(url) {
  const m = url.match(/\.([a-z0-9]{1,8})(?:\?|$)/i);
  return m ? `.${m[1].toLowerCase()}` : '.jpg';
}

async function ensureRegion() {
  const existing = await prisma.feedRegion.findUnique({ where: { code: REGION_CODE } });
  if (existing) {
    if (!existing.isEnabled) {
      await prisma.feedRegion.update({ where: { id: existing.id }, data: { isEnabled: true } });
    }
    return existing;
  }
  return prisma.feedRegion.create({
    data: { code: REGION_CODE, name: REGION_NAME, isEnabled: true },
  });
}

async function ensureFolder() {
  const existing = await prisma.mediaFolder.findFirst({
    where: { name: FOLDER_NAME, parentId: null, isTrash: false },
  });
  if (existing) return existing;
  return prisma.mediaFolder.create({ data: { name: FOLDER_NAME, parentId: null } });
}

async function alreadyImported(regionId, donorId) {
  const externalId = `donor:${donorId}`;
  const row = await prisma.listing.findUnique({
    where: { regionId_externalId: { regionId, externalId } },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function downloadPhotos(detail, folderId) {
  if (!detail.photoUrls.length) return [];
  mkdirSync(MEDIA_DIR, { recursive: true });
  const out = [];
  for (const url of detail.photoUrls) {
    const buf = await downloadBuffer(url);
    if (!buf?.length) {
      console.warn(`  [photo] failed ${url}`);
      continue;
    }
    const fname = `${randomUUID()}${ext(url)}`;
    const abs = join(MEDIA_DIR, fname);
    await fs.writeFile(abs, buf);
    out.push({
      url: `${PUBLIC_PREFIX}${fname}`,
      size: buf.length,
      original: url.split('/').pop() ?? null,
      folderId,
    });
  }
  return out;
}

async function createListing(detail, region, kind, photos) {
  const externalId = `donor:${detail.donorId}`;
  const sourceUrl = `${DONOR_BASE}/object.php?number=${detail.donorId}`;
  const price = detail.price && detail.price > 1000 ? detail.price : null;

  const photoUrls = photos.map((p) => p.url);
  const mainPhoto = photoUrls[0] ?? null;
  const extras = photoUrls.slice(1);

  const baseListingData = {
    regionId: region.id,
    kind,
    externalId,
    price: price != null ? new Prisma.Decimal(price) : null,
    currency: 'RUB',
    status: 'ACTIVE',
    dataSource: 'MANUAL',
    isPublished: true,
  };

  let createInput = { data: baseListingData };

  if (kind === 'APARTMENT') {
    const { floor, floorsTotal } = parseFloorAndTotal(detail.props);
    const areaTotal = parseAreaTotal(detail.props);
    const areaKitchen = parseAreaKitchen(detail.props);
    createInput = {
      data: {
        ...baseListingData,
        apartment: {
          create: {
            areaTotal: areaTotal != null ? new Prisma.Decimal(areaTotal) : null,
            areaKitchen: areaKitchen != null ? new Prisma.Decimal(areaKitchen) : null,
            floor,
            floorsTotal,
            number: detail.address ?? null,
            blockAddress: detail.address ?? null,
            buildingName: detail.props['Тип дома'] ?? null,
            finishingPhotoUrl: mainPhoto,
            extraPhotoUrls: extras.length > 0 ? extras : undefined,
          },
        },
      },
      include: { apartment: true },
    };
  } else if (kind === 'HOUSE') {
    const areaTotal = parseAreaTotal(detail.props);
    const areaLand = (() => {
      const v = detail.props['Площадь участка'];
      if (!v) return null;
      const m = v.match(/(\d+(?:[.,]\d+)?)/);
      return m ? Number(m[1].replace(',', '.')) : null;
    })();
    const yearBuilt = parseYearBuilt(detail.props);
    const bedrooms = parseRoomsCount(detail.title);
    createInput = {
      data: {
        ...baseListingData,
        house: {
          create: {
            houseType: null,
            areaTotal: areaTotal != null ? new Prisma.Decimal(areaTotal) : null,
            areaLand: areaLand != null ? new Prisma.Decimal(areaLand) : null,
            bedrooms,
            yearBuilt,
            photoUrl: mainPhoto,
            extraPhotoUrls: extras.length > 0 ? extras : undefined,
          },
        },
      },
      include: { house: true },
    };
  } else if (kind === 'LAND') {
    const sotki = parseLandSotki(detail.props);
    createInput = {
      data: {
        ...baseListingData,
        land: {
          create: {
            areaSotki: sotki != null ? new Prisma.Decimal(sotki) : null,
            landCategory: detail.props['Назначение'] ?? null,
            photoUrl: mainPhoto,
            extraPhotoUrls: extras.length > 0 ? extras : undefined,
          },
        },
      },
      include: { land: true },
    };
  } else if (kind === 'COMMERCIAL') {
    const area = parseAreaTotal(detail.props);
    createInput = {
      data: {
        ...baseListingData,
        commercial: {
          create: {
            commercialType: null,
            area: area != null ? new Prisma.Decimal(area) : null,
          },
        },
      },
      include: { commercial: true },
    };
  }

  return prisma.listing.create(createInput);
}

async function linkPhotos(listingId, photos) {
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    await prisma.mediaFile.create({
      data: {
        kind: 'PHOTO',
        url: p.url,
        originalFilename: p.original,
        sizeBytes: p.size != null ? BigInt(p.size) : null,
        sortOrder: i,
        folderId: p.folderId,
        entityType: 'listing',
        entityId: listingId,
      },
    });
  }
}

async function processSection(section, region, folder, stats) {
  const visited = new Set();
  const queue = [];
  // Iterate pages until we see a page with no new IDs (or 404)
  for (let page = 1; page <= SECTION_PAGE_LIMIT; page++) {
    const url = `${DONOR_BASE}/catalog.php?object=${section.code}&page=${page}`;
    const html = await fetchHtml(url);
    if (!html) break;
    const ids = extractIdsFromCatalog(html);
    const fresh = ids.filter((id) => !visited.has(id));
    if (!fresh.length) {
      // Stop if the page brought no new IDs
      break;
    }
    fresh.forEach((id) => {
      visited.add(id);
      queue.push(id);
    });
    console.log(`[${section.code}] page ${page}: +${fresh.length} (total ${visited.size})`);
    await sleep(REQUEST_DELAY_MS);
  }

  for (const donorId of queue) {
    const exists = await alreadyImported(region.id, donorId);
    if (exists) {
      stats.skipped++;
      continue;
    }
    const detailHtml = await fetchHtml(`${DONOR_BASE}/object.php?number=${donorId}`);
    if (!detailHtml) {
      console.warn(`  [skip] cannot fetch donor #${donorId}`);
      stats.failed++;
      continue;
    }
    const detail = parseDetail(detailHtml, donorId);
    if (!detail || !detail.title) {
      console.warn(`  [skip] empty parse donor #${donorId}`);
      stats.failed++;
      continue;
    }
    try {
      const photos = await downloadPhotos(detail, folder.id);
      const listing = await createListing(detail, region, section.kind, photos);
      await linkPhotos(listing.id, photos);
      stats.created++;
      console.log(
        `  + #${donorId} → listing ${listing.id} (${section.kind}, photos=${photos.length})`,
      );
    } catch (e) {
      console.error(`  ! donor #${donorId} create failed: ${e.message}`);
      stats.failed++;
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function main() {
  if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
  console.log(`MEDIA_ROOT=${MEDIA_ROOT}`);
  const region = await ensureRegion();
  const folder = await ensureFolder();
  console.log(`Region #${region.id} (${region.code}), folder #${folder.id} (${folder.name})`);

  const stats = { created: 0, skipped: 0, failed: 0 };
  for (const section of SECTIONS) {
    console.log(`\n=== Section ${section.code} → ${section.kind} ===`);
    await processSection(section, region, folder, stats);
  }

  console.log(`\n=== Done. Created ${stats.created}, skipped ${stats.skipped}, failed ${stats.failed} ===`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
