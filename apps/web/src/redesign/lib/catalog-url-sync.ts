import type { CatalogFilters, MarketType, ObjectType } from '@/redesign/data/types';
import { defaultFilters } from '@/redesign/data/types';

/** Ключи URL, влияющие на состояние фильтров каталога (sort, region_id, geo не сбрасывают фильтры). */
export const CATALOG_FILTER_URL_KEYS = [
  'type',
  'market',
  'search',
  'rooms',
  'price_min',
  'price_max',
  'priceMin',
  'priceMax',
  'priceFrom',
  'priceTo',
  'area_min',
  'area_max',
  'areaMin',
  'areaMax',
  'floor_min',
  'floor_max',
  'floorMin',
  'floorMax',
  'deadline',
  'finishing_ids',
  'district_names',
  'subway_names',
  'builder_names',
  'status',
] as const;

export function catalogFilterUrlSignature(sp: URLSearchParams): string {
  const parts: string[] = [];
  for (const k of CATALOG_FILTER_URL_KEYS) {
    const v = sp.get(k);
    if (v) parts.push(`${k}=${v}`);
  }
  return parts.sort().join('&');
}

/** То же масштабирование цены, что в HeroSearch (< 1e6 считаются миллионами). */
export function heroDigitsToRubles(digitsRaw: string): number | undefined {
  const digits = digitsRaw.replace(/\D/g, '');
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n < 1_000_000) return n * 1_000_000;
  return n;
}

function parseFiniteNumber(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseRoomCategories(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 4);
}

function parseStringList(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Приводим название отделки из справочника к меткам FilterSidebar. */
export function sidebarLabelFromFinishingName(apiName: string): string {
  const n = apiName.trim().toLowerCase();
  if (n.includes('предчист') || n.includes('подчист')) return apiName.trim();
  if (n.includes('чистов')) return 'чистовая';
  if (n.includes('чернов')) return 'черновая';
  if (n.includes('под ключ')) return 'под ключ';
  if (n.includes('без отделк')) return 'без отделки';
  const exact = ['чистовая', 'черновая', 'под ключ', 'без отделки'].find((x) => x === n);
  if (exact) return exact;
  return apiName.trim();
}

export function finishingIdsFromSidebarLabels(labels: string[], rows: { id: number; name: string }[]): number[] {
  const want = new Set(labels.map((l) => l.trim().toLowerCase()));
  const ids: number[] = [];
  for (const r of rows) {
    const lb = sidebarLabelFromFinishingName(r.name).toLowerCase();
    if (want.has(lb)) ids.push(r.id);
  }
  return [...new Set(ids)];
}

/** Категории комнатности для URL каталога (как FilterSidebar): 0=студия, 1–3, 4=4+. */
export function roomCategoriesFromHeroLabel(label: string): number[] {
  if (!label || label === 'Тип квартиры') return [];
  const lower = label.toLowerCase();
  if (lower.includes('студ')) return [0];
  if (lower.includes('4+') || lower.includes('4 +')) return [4];
  const m = label.match(/(\d)/);
  if (m) {
    const d = parseInt(m[1], 10);
    if (d >= 1 && d <= 3) return [d];
  }
  return [];
}

export function sidebarLabelsFromFinishingIds(ids: number[], rows: { id: number; name: string }[]): string[] {
  const idSet = new Set(ids);
  const out: string[] = [];
  for (const r of rows) {
    if (!idSet.has(r.id)) continue;
    const lb = sidebarLabelFromFinishingName(r.name);
    if (!out.includes(lb)) out.push(lb);
  }
  return out;
}

/**
 * Полное состояние фильтров каталога из адресной строки (герой, шаринг, назад в браузере).
 */
export function catalogFiltersFromSearchParams(
  sp: URLSearchParams,
  finishings?: { id: number; name: string }[],
): CatalogFilters {
  const f: CatalogFilters = JSON.parse(JSON.stringify(defaultFilters)) as CatalogFilters;

  const type = sp.get('type');
  if (type && ['apartments', 'houses', 'land', 'commercial'].includes(type)) {
    f.objectType = type as ObjectType;
  }

  const market = sp.get('market');
  if (market && ['all', 'new', 'secondary'].includes(market)) {
    f.marketType = market as MarketType;
  }

  f.search = sp.get('search') ?? '';

  f.rooms = parseRoomCategories(sp.get('rooms'));

  const pMin =
    parseFiniteNumber(sp.get('price_min')) ??
    parseFiniteNumber(sp.get('priceMin')) ??
    heroDigitsToRubles(sp.get('priceFrom') ?? '');
  const pMax =
    parseFiniteNumber(sp.get('price_max')) ??
    parseFiniteNumber(sp.get('priceMax')) ??
    heroDigitsToRubles(sp.get('priceTo') ?? '');
  if (pMin !== undefined) f.priceMin = pMin;
  if (pMax !== undefined) f.priceMax = pMax;

  const aMin =
    parseFiniteNumber(sp.get('area_min')) ?? parseFiniteNumber(sp.get('areaMin'));
  const aMax =
    parseFiniteNumber(sp.get('area_max')) ?? parseFiniteNumber(sp.get('areaMax'));
  if (aMin !== undefined) f.areaMin = aMin;
  if (aMax !== undefined) f.areaMax = aMax;

  const flMin =
    parseFiniteNumber(sp.get('floor_min')) ?? parseFiniteNumber(sp.get('floorMin'));
  const flMax =
    parseFiniteNumber(sp.get('floor_max')) ?? parseFiniteNumber(sp.get('floorMax'));
  if (flMin !== undefined) f.floorMin = flMin;
  if (flMax !== undefined) f.floorMax = flMax;

  const dl = sp.get('deadline');
  if (dl?.trim()) {
    f.deadline = parseStringList(dl);
  }

  f.district = parseStringList(sp.get('district_names'));
  f.subway = parseStringList(sp.get('subway_names'));
  f.builder = parseStringList(sp.get('builder_names'));
  f.status = parseStringList(sp.get('status')).filter((s) => ['building', 'completed', 'planned'].includes(s));

  const finIds = sp.get('finishing_ids');
  if (finIds?.trim()) {
    const ids = finIds
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n));
    if (ids.length && finishings?.length) {
      f.finishing = sidebarLabelsFromFinishingIds(ids, finishings);
    }
  }

  return f;
}

export function catalogFiltersIntoSearchParams(
  base: URLSearchParams,
  f: CatalogFilters,
  finishings?: { id: number; name: string }[],
): URLSearchParams {
  const p = new URLSearchParams(base.toString());

  if (f.search.trim()) p.set('search', f.search.trim());
  else p.delete('search');

  if (f.objectType !== 'apartments') p.set('type', f.objectType);
  else p.delete('type');

  if (f.marketType !== 'all') p.set('market', f.marketType);
  else p.delete('market');

  if (f.rooms.length) p.set('rooms', f.rooms.join(','));
  else p.delete('rooms');

  if (f.priceMin != null && Number.isFinite(f.priceMin)) p.set('price_min', String(Math.round(f.priceMin)));
  else p.delete('price_min');
  if (f.priceMax != null && Number.isFinite(f.priceMax)) p.set('price_max', String(Math.round(f.priceMax)));
  else p.delete('price_max');

  if (f.areaMin != null && Number.isFinite(f.areaMin)) p.set('area_min', String(f.areaMin));
  else p.delete('area_min');
  if (f.areaMax != null && Number.isFinite(f.areaMax)) p.set('area_max', String(f.areaMax));
  else p.delete('area_max');

  if (f.floorMin != null && Number.isFinite(f.floorMin)) p.set('floor_min', String(f.floorMin));
  else p.delete('floor_min');
  if (f.floorMax != null && Number.isFinite(f.floorMax)) p.set('floor_max', String(f.floorMax));
  else p.delete('floor_max');

  if (f.deadline.length) p.set('deadline', f.deadline.join(','));
  else p.delete('deadline');

  if (f.district.length) p.set('district_names', f.district.join(','));
  else p.delete('district_names');

  if (f.subway.length) p.set('subway_names', f.subway.join(','));
  else p.delete('subway_names');

  if (f.builder.length) p.set('builder_names', f.builder.join(','));
  else p.delete('builder_names');

  if (f.status.length) p.set('status', f.status.join(','));
  else p.delete('status');

  if (f.finishing.length && finishings?.length) {
    const ids = finishingIdsFromSidebarLabels(f.finishing, finishings);
    if (ids.length) p.set('finishing_ids', ids.join(','));
    else p.delete('finishing_ids');
  } else p.delete('finishing_ids');

  p.delete('priceFrom');
  p.delete('priceTo');
  p.delete('priceMin');
  p.delete('priceMax');
  p.delete('areaMin');
  p.delete('areaMax');
  p.delete('floorMin');
  p.delete('floorMax');
  p.delete('district');
  p.delete('subway');
  p.delete('builder');

  return p;
}
