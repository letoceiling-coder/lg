import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import MapSearch from '@/redesign/components/MapSearch';
import ListingsMapSearch, { type ListingMapItem } from '@/redesign/components/ListingsMapSearch';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { apiGet } from '@/lib/api';
import { defaultFilters, type CatalogFilters, type ObjectType } from '@/redesign/data/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { formatPrice } from '@/redesign/data/mock-data';
import { cn } from '@/lib/utils';

const PER_PAGE = 200;

const KIND_BY_TYPE: Record<ObjectType, string> = {
  apartments: 'APARTMENT',
  houses: 'HOUSE',
  land: 'LAND',
  commercial: 'COMMERCIAL',
};

function normalizeDistrictValue(name: string): string {
  return name.trim()
    .replace(/^ГО\s+/i, '')
    .replace(/^(г\.?\s*)/i, '')
    .replace(/,\s*МО\s*$/i, '')
    .trim();
}

const statusMap: Record<string, string> = {
  building: 'BUILDING',
  completed: 'COMPLETED',
  planned: 'PROJECT',
};

function getListingPhoto(l: any): string | null {
  if (l.apartment?.extraPhotoUrls?.length) return l.apartment.extraPhotoUrls[0];
  if (l.house?.photoUrl) return l.house.photoUrl;
  if (l.house?.extraPhotoUrls?.length) return l.house.extraPhotoUrls[0];
  if (l.land?.photoUrl) return l.land.photoUrl;
  if (l.commercial?.photoUrl) return l.commercial.photoUrl;
  return null;
}

const RedesignMap = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters });
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [activeListing, setActiveListing] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const geoPreset = searchParams.get('geo_preset') ?? undefined;
  const geoPolygon = searchParams.get('geo_polygon') ?? undefined;
  const geoLat = searchParams.get('geo_lat');
  const geoLng = searchParams.get('geo_lng');
  const geoRadius = searchParams.get('geo_radius_m');

  const { data: defaultRegionId, setStoredRegionId, isLoading: regionLoading } = useDefaultRegionId();
  const urlRegionIdRaw = searchParams.get('region_id');
  const urlRegionId = urlRegionIdRaw ? parseInt(urlRegionIdRaw, 10) : NaN;
  const regionId =
    Number.isFinite(urlRegionId) && urlRegionId > 0 ? urlRegionId : defaultRegionId;

  useEffect(() => {
    if (Number.isFinite(urlRegionId) && urlRegionId > 0) {
      setStoredRegionId(urlRegionId);
    }
  }, [urlRegionId, setStoredRegionId]);

  // Sync objectType from URL if provided
  const urlObjectType = searchParams.get('object_type') as ObjectType | null;
  useEffect(() => {
    if (urlObjectType && urlObjectType !== filters.objectType) {
      setFilters((prev) => ({ ...prev, objectType: urlObjectType }));
    }
  }, [urlObjectType]);

  const deferredSearch = useDeferredValue(filters.search);
  const objectType = filters.objectType;

  // Kind counts – drives the type switcher
  const kindCountsQuery = useQuery({
    queryKey: ['stats', 'listing-kind-counts', regionId],
    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId),
    staleTime: 5 * 60 * 1000,
  });

  const kindCounts = kindCountsQuery.data ?? {};
  const availableKindLinks = useMemo(() => {
    const all = [
      { type: 'apartments' as ObjectType, label: 'Квартиры', count: kindCounts.APARTMENT ?? 0 },
      { type: 'houses' as ObjectType, label: 'Дома и дачи', count: kindCounts.HOUSE ?? 0 },
      { type: 'land' as ObjectType, label: 'Участки', count: kindCounts.LAND ?? 0 },
      { type: 'commercial' as ObjectType, label: 'Коммерция', count: kindCounts.COMMERCIAL ?? 0 },
    ];
    return all.filter((x) => x.count > 0);
  }, [kindCounts]);

  // Deadlines (apartments only)
  const deadlinesQuery = useQuery({
    queryKey: ['blocks', 'deadlines', regionId],
    queryFn: () => apiGet<string[]>(`/blocks/deadlines?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId) && objectType === 'apartments',
    staleTime: 5 * 60 * 1000,
  });

  // Districts, subways, builders
  // Pass listing kind so districts list only shows areas with objects of selected type
  const districtKind = KIND_BY_TYPE[objectType];
  const districtsQuery = useQuery({
    queryKey: ['districts', regionId, districtKind],
    queryFn: () => apiGet<{ name: string }[]>(`/districts?region_id=${regionId}&kind=${districtKind}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const subwaysQuery = useQuery({
    queryKey: ['subways', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/subways?region_id=${regionId}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const buildersQuery = useQuery({
    queryKey: ['builders', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/builders?region_id=${regionId}`),
    enabled: regionId != null && objectType === 'apartments',
    select: (r) => r.map((x) => x.name),
  });

  // Blocks query – only for apartments
  const blocksQuery = useQuery({
    queryKey: [
      'blocks', 'map', regionId, filters.marketType, deferredSearch,
      filters.priceMin, filters.priceMax, filters.rooms,
      filters.areaMin, filters.areaMax, filters.floorMin, filters.floorMax,
      filters.status, filters.district, filters.subway, filters.builder,
      filters.deadline, geoPreset, geoPolygon, geoLat, geoLng, geoRadius,
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      if (deferredSearch.trim()) sp.set('search', deferredSearch.trim());
      sp.set('page', '1');
      sp.set('per_page', String(PER_PAGE));
      sp.set('require_active_listings', 'true');
      sp.set('sort', 'name_asc');
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));
      if (filters.areaMin) sp.set('area_min', String(filters.areaMin));
      if (filters.areaMax) sp.set('area_max', String(filters.areaMax));
      if (filters.floorMin) sp.set('floor_min', String(filters.floorMin));
      if (filters.floorMax) sp.set('floor_max', String(filters.floorMax));
      if (filters.marketType === 'new') sp.set('status', 'BUILDING');
      else if (filters.marketType === 'secondary') sp.set('status', 'COMPLETED');
      else if (filters.status.length === 1) {
        const s = statusMap[filters.status[0]];
        if (s) sp.set('status', s);
      }
      if (filters.district.length) sp.set('district_names', filters.district.map(normalizeDistrictValue).join(','));
      if (filters.subway.length) sp.set('subway_names', filters.subway.join(','));
      if (filters.builder.length) sp.set('builder_names', filters.builder.join(','));
      if (filters.deadline.length) sp.set('deadline', filters.deadline.join(','));
      if (geoPreset) sp.set('geo_preset', geoPreset);
      if (geoPolygon) sp.set('geo_polygon', geoPolygon);
      if (geoLat && geoLng && geoRadius) {
        sp.set('geo_lat', geoLat);
        sp.set('geo_lng', geoLng);
        sp.set('geo_radius_m', geoRadius);
      }
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
    enabled: regionId != null && objectType === 'apartments',
  });

  const blocks = useMemo(
    () => blocksQuery.data?.data.map(mapApiBlockListRowToResidentialComplex) ?? [],
    [blocksQuery.data],
  );

  // Listings query – used when:
  //   1. objectType is not apartments, OR
  //   2. objectType is apartments but no blocks found
  const needListings = objectType !== 'apartments' || (blocksQuery.isFetched && blocks.length === 0);

  const listingsQuery = useQuery({
    queryKey: [
      'listings', 'map', regionId, objectType,
      filters.priceMin, filters.priceMax,
      filters.areaMin, filters.areaMax,
      filters.floorMin, filters.floorMax,
      filters.rooms, filters.district,
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      sp.set('per_page', String(PER_PAGE));
      sp.set('page', '1');
      sp.set('kind', KIND_BY_TYPE[objectType]);
      sp.set('status', 'ACTIVE');
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.areaMin) sp.set('area_total_min', String(filters.areaMin));
      if (filters.areaMax) sp.set('area_total_max', String(filters.areaMax));
      if (filters.floorMin) sp.set('floor_min', String(filters.floorMin));
      if (filters.floorMax) sp.set('floor_max', String(filters.floorMax));
      if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));
      if (filters.district.length) sp.set('district_names', filters.district.map(normalizeDistrictValue).join(','));
      return apiGet<{ data: any[] }>(`/listings?${sp}`);
    },
    enabled: regionId != null && needListings,
  });

  const listingItems = useMemo<ListingMapItem[]>(() => {
    return (listingsQuery.data?.data ?? [])
      .filter((l: any) => l.lat != null && l.lng != null)
      .map((l: any) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        price: l.price,
        title: l.title ?? null,
        kind: l.kind,
        address: l.address ?? null,
        photoUrl: getListingPhoto(l),
      }));
  }, [listingsQuery.data]);

  // Decide what to show on map: blocks (for new-build apartments) or individual listings
  const useBlocksMap = objectType === 'apartments' && blocks.length > 0;

  const loading =
    regionLoading ||
    (regionId != null &&
      (useBlocksMap
        ? blocksQuery.isPending || blocksQuery.isFetching
        : listingsQuery.isPending || listingsQuery.isFetching));

  const totalCount = useBlocksMap ? blocks.length : listingItems.length;
  const subtitle = loading ? 'Загрузка…' : `${totalCount} объектов на карте`;

  // Derive available objectType options from kindCounts
  const objectTypeOptions = useMemo(
    () => availableKindLinks.map((x) => x.type),
    [availableKindLinks],
  );

  return (
    <div className="flex h-svh flex-col bg-background">
      <RedesignHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sidebar filters */}
        <aside className="hidden min-h-0 w-[280px] shrink-0 overflow-y-auto border-r border-border bg-background p-4 lg:block">
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            totalCount={totalCount}
            districtOptions={districtsQuery.data}
            subwayOptions={subwaysQuery.data}
            builderOptions={buildersQuery.data}
            deadlineOptions={deadlinesQuery.data}
            objectTypeOptions={objectTypeOptions.length > 0 ? objectTypeOptions : undefined}
            hasBlocks={useBlocksMap}
          />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Map */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:min-w-0">
            <div className="mb-2 flex shrink-0 items-center justify-between lg:mb-3">
              <span className="text-sm font-semibold">{subtitle}</span>
              <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
              </Button>
            </div>
            <div className="relative min-h-0 flex-1">
              {useBlocksMap ? (
                <MapSearch
                  complexes={blocks}
                  regionId={regionId}
                  activeSlug={activeBlock}
                  onSelect={setActiveBlock}
                  height="100%"
                  compact
                />
              ) : (
                <ListingsMapSearch
                  listings={listingItems}
                  regionId={regionId}
                  activeId={activeListing}
                  onSelect={setActiveListing}
                  height="100%"
                  compact
                />
              )}
            </div>
          </div>

          {/* Right sidebar list */}
          <aside
            className={cn(
              'flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-border bg-muted/20',
              'max-h-[40vh] lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0',
            )}
          >
            <div className="px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
              <p className="text-xs font-semibold text-foreground">
                {useBlocksMap ? 'Список ЖК' : 'Список объектов'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Нажмите строку — метка на карте подсветится
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5 min-h-0">
              {loading ? (
                <p className="text-xs text-muted-foreground p-3">Загрузка…</p>
              ) : useBlocksMap ? (
                blocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">Нет объектов по фильтрам.</p>
                ) : (
                  blocks.map((c) => (
                    <div key={c.id} className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveBlock(c.slug === activeBlock ? null : c.slug)}
                        className={cn(
                          'flex-1 min-w-0 text-left flex gap-2.5 p-2 rounded-lg border transition-colors',
                          activeBlock === c.slug
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border/60 bg-background hover:bg-muted/60',
                        )}
                      >
                        <img
                          src={c.images[0] || '/placeholder.svg'}
                          alt=""
                          className="w-14 h-11 rounded-md object-cover shrink-0 bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                        />
                        <div className="min-w-0 flex-1 py-0.5">
                          <p className="font-medium text-xs leading-snug line-clamp-2">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.district}</p>
                          <p className="text-[11px] font-semibold text-primary mt-0.5">
                            {c.priceFrom > 0 ? `от ${formatPrice(c.priceFrom)}` : '—'}
                          </p>
                        </div>
                      </button>
                      <Link
                        to={`/complex/${c.slug}`}
                        className="self-center shrink-0 text-[10px] text-primary font-medium px-1.5 py-2 hover:underline"
                      >
                        →
                      </Link>
                    </div>
                  ))
                )
              ) : listingItems.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Нет объектов по фильтрам.</p>
              ) : (
                listingItems.map((l) => (
                  <div key={l.id} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveListing(l.id === activeListing ? null : l.id)}
                      className={cn(
                        'flex-1 min-w-0 text-left flex gap-2.5 p-2 rounded-lg border transition-colors',
                        activeListing === l.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/60 bg-background hover:bg-muted/60',
                      )}
                    >
                      {l.photoUrl ? (
                        <img
                          src={l.photoUrl}
                          alt=""
                          className="w-14 h-11 rounded-md object-cover shrink-0 bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-14 h-11 rounded-md bg-muted shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="font-medium text-xs leading-snug line-clamp-2">
                          {l.title ?? l.address ?? `Объект #${l.id}`}
                        </p>
                        {l.address && l.title && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{l.address}</p>
                        )}
                        <p className="text-[11px] font-semibold text-primary mt-0.5">
                          {l.price ? `${parseFloat(String(l.price)).toLocaleString('ru-RU')} ₽` : '—'}
                        </p>
                      </div>
                    </button>
                    <Link
                      to={`/listing/${l.id}`}
                      className="self-center shrink-0 text-[10px] text-primary font-medium px-1.5 py-2 hover:underline"
                    >
                      →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile filter overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button type="button" onClick={() => setShowFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              totalCount={totalCount}
              districtOptions={districtsQuery.data}
              subwayOptions={subwaysQuery.data}
              builderOptions={buildersQuery.data}
              deadlineOptions={deadlinesQuery.data}
              objectTypeOptions={objectTypeOptions.length > 0 ? objectTypeOptions : undefined}
              hasBlocks={useBlocksMap}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>
              Показать {totalCount} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignMap;
