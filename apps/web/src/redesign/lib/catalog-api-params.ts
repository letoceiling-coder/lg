import type { CatalogFilters, ObjectType } from '@/redesign/data/types';
import { finishingIdsFromSidebarLabels } from '@/redesign/lib/catalog-url-sync';

export type ListingKind = 'APARTMENT' | 'HOUSE' | 'LAND' | 'COMMERCIAL';

export type FinishingRow = { id: number; name: string };

export type CatalogGeoParams = {
  geoPreset?: string;
  geoPolygon?: string;
  geoLat?: string | null;
  geoLng?: string | null;
  geoRadius?: string | null;
};

const STATUS_MAP: Record<string, string> = {
  building: 'BUILDING',
  completed: 'COMPLETED',
  planned: 'PROJECT',
};

export const LISTING_KIND_BY_OBJECT_TYPE: Record<ObjectType, ListingKind> = {
  apartments: 'APARTMENT',
  houses: 'HOUSE',
  land: 'LAND',
  commercial: 'COMMERCIAL',
};

function setFinite(sp: URLSearchParams, key: string, value: number | undefined): void {
  if (value != null && Number.isFinite(value)) sp.set(key, String(value));
}

function setCsv(sp: URLSearchParams, key: string, values: Array<string | number>): void {
  if (values.length) sp.set(key, values.join(','));
}

function setGeo(sp: URLSearchParams, geo?: CatalogGeoParams): void {
  if (!geo) return;
  if (geo.geoPreset) sp.set('geo_preset', geo.geoPreset);
  if (geo.geoPolygon) sp.set('geo_polygon', geo.geoPolygon);
  if (geo.geoLat && geo.geoLng && geo.geoRadius) {
    sp.set('geo_lat', geo.geoLat);
    sp.set('geo_lng', geo.geoLng);
    sp.set('geo_radius_m', geo.geoRadius);
  }
}

function setFinishing(sp: URLSearchParams, filters: CatalogFilters, finishings?: FinishingRow[]): void {
  if (!filters.finishing.length || !finishings?.length) return;
  const ids = finishingIdsFromSidebarLabels(filters.finishing, finishings);
  setCsv(sp, 'finishing', ids);
}

export function hasNarrowingFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.marketType !== 'all' ||
      filters.rooms.length ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.areaMin != null ||
      filters.areaMax != null ||
      filters.floorMin != null ||
      filters.floorMax != null ||
      filters.deadline.length ||
      filters.finishing.length ||
      filters.status.length ||
      filters.district.length ||
      filters.subway.length ||
      filters.builder.length,
  );
}

export function buildBlocksSearchParams(args: {
  filters: CatalogFilters;
  regionId?: number | null;
  finishings?: FinishingRow[];
  page?: number;
  perPage?: number;
  sort?: string;
  geo?: CatalogGeoParams;
  requireActiveListings?: boolean;
}): URLSearchParams {
  const { filters, regionId, finishings, page, perPage, sort, geo, requireActiveListings } = args;
  const sp = new URLSearchParams();
  if (regionId != null) sp.set('region_id', String(regionId));
  if (filters.search.trim()) sp.set('search', filters.search.trim());
  if (page != null) sp.set('page', String(page));
  if (perPage != null) sp.set('per_page', String(perPage));
  if (sort) sp.set('sort', sort);
  if (requireActiveListings) sp.set('require_active_listings', 'true');

  setFinite(sp, 'price_min', filters.priceMin);
  setFinite(sp, 'price_max', filters.priceMax);
  setFinite(sp, 'area_min', filters.areaMin);
  setFinite(sp, 'area_max', filters.areaMax);
  setFinite(sp, 'floor_min', filters.floorMin);
  setFinite(sp, 'floor_max', filters.floorMax);
  setCsv(sp, 'rooms', filters.rooms);
  setCsv(sp, 'deadline', filters.deadline);
  setFinishing(sp, filters, finishings);

  if (filters.marketType === 'new') {
    sp.set('status', 'BUILDING');
  } else if (filters.status.length === 1) {
    const status = STATUS_MAP[filters.status[0]];
    if (status) sp.set('status', status);
  }

  setCsv(sp, 'district_names', filters.district);
  setCsv(sp, 'subway_names', filters.subway);
  setCsv(sp, 'builder_names', filters.builder);
  setGeo(sp, geo);
  return sp;
}

export function buildListingsSearchParams(args: {
  filters: CatalogFilters;
  regionId?: number | null;
  kind?: ListingKind;
  finishings?: FinishingRow[];
  page?: number;
  perPage?: number;
  geo?: CatalogGeoParams;
}): URLSearchParams {
  const { filters, regionId, kind = LISTING_KIND_BY_OBJECT_TYPE[filters.objectType], finishings, page, perPage, geo } = args;
  const sp = new URLSearchParams();
  if (regionId != null) sp.set('region_id', String(regionId));
  sp.set('kind', kind);
  sp.set('statuses', 'ACTIVE,RESERVED');
  sp.set('is_published', 'true');
  if (page != null) sp.set('page', String(page));
  if (perPage != null) sp.set('per_page', String(perPage));
  if (filters.search.trim()) sp.set('search', filters.search.trim());

  setFinite(sp, 'price_min', filters.priceMin);
  setFinite(sp, 'price_max', filters.priceMax);
  setFinite(sp, 'area_total_min', filters.areaMin);
  setFinite(sp, 'area_total_max', filters.areaMax);
  setCsv(sp, 'district_names', filters.district);
  setGeo(sp, geo);

  if (kind === 'APARTMENT') {
    setCsv(sp, 'rooms', filters.rooms);
    setFinite(sp, 'floor_min', filters.floorMin);
    setFinite(sp, 'floor_max', filters.floorMax);
    setFinishing(sp, filters, finishings);
    if (filters.marketType === 'secondary') sp.set('apartment_market', 'secondary');
    else if (filters.marketType === 'new') sp.set('apartment_market', 'new_building');
  }

  return sp;
}
