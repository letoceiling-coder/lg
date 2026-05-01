import { useState, useMemo, useDeferredValue, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import MapSearch from '@/redesign/components/MapSearch';
import ListingsMapSearch, { type ListingMapItem } from '@/redesign/components/ListingsMapSearch';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { apiGet } from '@/lib/api';
import { defaultFilters, type CatalogFilters, type ObjectType } from '@/redesign/data/types';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDefaultRegionId, type RegionRow } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import {
  catalogFilterUrlSignature,
  catalogFiltersFromSearchParams,
  catalogFiltersIntoSearchParams,
} from '@/redesign/lib/catalog-url-sync';
import {
  buildBlocksSearchParams,
  buildListingsSearchParams,
  LISTING_KIND_BY_OBJECT_TYPE,
} from '@/redesign/lib/catalog-api-params';
import { formatPrice, formatListingPriceFromApi } from '@/redesign/data/mock-data';
import { LIVEGRID_LOGO_SRC } from '@/redesign/lib/branding';
import { cn } from '@/lib/utils';

const PER_PAGE = 200;

const OBJECT_TYPE_TABS: { type: ObjectType; label: string; countKey: string }[] = [
  { type: 'apartments', label: 'Квартиры', countKey: 'APARTMENT' },
  { type: 'rooms', label: 'Комнаты', countKey: 'APARTMENT' },
  { type: 'houses', label: 'Дома', countKey: 'HOUSE' },
  { type: 'land', label: 'Участки', countKey: 'LAND' },
  { type: 'dachas', label: 'Дачи', countKey: 'HOUSE' },
  { type: 'commercial', label: 'Коммерция', countKey: 'COMMERCIAL' },
];

function getListingPhoto(l: any): string | null {
  const tryUrl = (raw: unknown): string | null => {
    if (typeof raw === 'string' && raw.trim()) return raw;
    return null;
  };
  const fromArray = (arr: unknown): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const it of arr) {
      const u = tryUrl(it);
      if (u) return u;
    }
    return null;
  };
  return (
    tryUrl(l.house?.photoUrl) ??
    fromArray(l.house?.extraPhotoUrls) ??
    tryUrl(l.land?.photoUrl) ??
    fromArray(l.land?.extraPhotoUrls) ??
    tryUrl(l.apartment?.finishingPhotoUrl) ??
    fromArray(l.apartment?.extraPhotoUrls) ??
    tryUrl(l.apartment?.planUrl) ??
    null
  );
}

function regionCenterFromRow(region?: RegionRow): [number, number] | null {
  const lat = Number(region?.mapCenterLat);
  const lng = Number(region?.mapCenterLng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function fallbackCoords(center: [number, number] | null, index: number): [number, number] | null {
  if (!center) return null;
  const ring = Math.floor(index / 12) + 1;
  const angle = (index % 12) * (Math.PI / 6);
  const radius = 0.018 * ring;
  return [
    center[0] + Math.sin(angle) * radius,
    center[1] + Math.cos(angle) * radius,
  ];
}

const RedesignMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters });
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [activeListing, setActiveListing] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const geoPreset = searchParams.get('geo_preset') ?? undefined;
  const geoPolygon = searchParams.get('geo_polygon') ?? undefined;
  const geoLat = searchParams.get('geo_lat');
  const geoLng = searchParams.get('geo_lng');
  const geoRadius = searchParams.get('geo_radius_m');

  const { data: defaultRegionId, rows: regionRows, setStoredRegionId, isLoading: regionLoading } = useDefaultRegionId();
  const urlRegionIdRaw = searchParams.get('region_id');
  const urlRegionId = urlRegionIdRaw ? parseInt(urlRegionIdRaw, 10) : NaN;
  const regionId =
    Number.isFinite(urlRegionId) && urlRegionId > 0 ? urlRegionId : defaultRegionId;
  const regionCenter = useMemo(
    () => regionCenterFromRow(regionRows?.find((r) => r.id === regionId)),
    [regionId, regionRows],
  );

  useEffect(() => {
    if (Number.isFinite(urlRegionId) && urlRegionId > 0) {
      setStoredRegionId(urlRegionId);
    }
  }, [urlRegionId, setStoredRegionId]);

  const deferredSearch = useDeferredValue(filters.search);
  const objectType = filters.objectType;
  const isUnsupportedSeparateType = objectType === 'rooms' || objectType === 'dachas';
  const useBlocksForApartments = objectType === 'apartments' && filters.marketType !== 'secondary';

  // Kind counts – drives the type switcher
  const kindCountsQuery = useQuery({
    queryKey: ['stats', 'listing-kind-counts', regionId],
    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId),
    staleTime: 5 * 60 * 1000,
  });

  const kindCounts = kindCountsQuery.data ?? {};
  const objectKindLinks = useMemo(
    () => OBJECT_TYPE_TABS.map((x) => ({ ...x, count: kindCounts[x.countKey] ?? 0 })),
    [kindCounts],
  );
  const isMoscowRegion = useMemo(() => {
    const r = regionRows?.find((row) => row.id === regionId);
    const code = (r?.code ?? '').toLowerCase();
    const name = (r?.name ?? '').toLowerCase();
    return code === 'msk' || name.includes('москва');
  }, [regionId, regionRows]);

  // Deadlines (apartments only)
  const deadlinesQuery = useQuery({
    queryKey: ['blocks', 'deadlines', regionId],
    queryFn: () => apiGet<string[]>(`/blocks/deadlines?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId) && objectType === 'apartments',
    staleTime: 5 * 60 * 1000,
  });

  // Districts, subways, builders
  // Pass listing kind so districts list only shows areas with objects of selected type
  const districtKind = LISTING_KIND_BY_OBJECT_TYPE[objectType];
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

  const { data: finishingRowsForMap } = useQuery({
    queryKey: ['reference', 'finishings'],
    queryFn: () => apiGet<Array<{ id: number; name: string }>>('/reference/finishings'),
    staleTime: 60 * 60 * 1000,
  });

  const mapUrlSig = useMemo(
    () => catalogFilterUrlSignature(new URLSearchParams(searchParams)),
    [searchParams.toString()],
  );

  useEffect(() => {
    setFilters(catalogFiltersFromSearchParams(new URLSearchParams(window.location.search), finishingRowsForMap ?? undefined));
  }, [mapUrlSig, finishingRowsForMap]);

  // Blocks query – only for apartments
  const blocksQuery = useQuery({
    queryKey: [
      'blocks', 'map', regionId, filters.marketType, deferredSearch,
      filters.priceMin, filters.priceMax, filters.rooms,
      filters.areaMin, filters.areaMax, filters.floorMin, filters.floorMax,
      filters.marketType, filters.status, filters.district, filters.subway, filters.builder,
      filters.deadline, filters.finishing, geoPreset, geoPolygon, geoLat, geoLng, geoRadius,
    ],
    queryFn: async () => {
      const sp = buildBlocksSearchParams({
        filters: { ...filters, search: deferredSearch },
        regionId,
        finishings: finishingRowsForMap,
        page: 1,
        perPage: PER_PAGE,
        sort: 'name_asc',
        requireActiveListings: true,
        geo: { geoPreset, geoPolygon, geoLat, geoLng, geoRadius },
      });
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
    },
    enabled: regionId != null && useBlocksForApartments,
  });

  const blocks = useMemo(
    () => blocksQuery.data?.data.map(mapApiBlockListRowToResidentialComplex) ?? [],
    [blocksQuery.data],
  );

  // Listings query – used when:
  //   1. objectType is not apartments, OR
  //   2. objectType is apartments but no blocks found
  const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);

  const listingsQuery = useQuery({
    queryKey: [
      'listings', 'map', regionId, objectType,
      deferredSearch,
      filters.priceMin, filters.priceMax,
      filters.areaMin, filters.areaMax,
      filters.floorMin, filters.floorMax,
      filters.rooms, filters.district, filters.marketType, filters.finishing,
    ],
    queryFn: async () => {
      const sp = buildListingsSearchParams({
        filters: { ...filters, search: deferredSearch },
        regionId,
        kind: LISTING_KIND_BY_OBJECT_TYPE[objectType],
        finishings: finishingRowsForMap,
        page: 1,
        perPage: PER_PAGE,
        geo: { geoPreset, geoPolygon, geoLat, geoLng, geoRadius },
      });
      return apiGet<{ data: any[] }>(`/listings?${sp}`);
    },
    enabled: regionId != null && needListings && !isUnsupportedSeparateType,
  });

  const listingItems = useMemo<ListingMapItem[]>(() => {
    const useApproximateCoords = objectType === 'apartments' && filters.marketType === 'secondary';
    return (listingsQuery.data?.data ?? [])
      .map((l: any, index: number) => {
        const fallback = useApproximateCoords ? fallbackCoords(regionCenter, index) : null;
        const lat = l.lat ?? fallback?.[0] ?? null;
        const lng = l.lng ?? fallback?.[1] ?? null;
        if (lat == null || lng == null) return null;
        return {
          id: l.id,
          lat,
          lng,
          price: l.price,
          title: l.title ?? null,
          kind: l.kind,
          address: l.address ?? null,
          photoUrl: getListingPhoto(l),
        };
      })
      .filter((l): l is ListingMapItem => l != null);
  }, [filters.marketType, listingsQuery.data, objectType, regionCenter]);

  // Decide what to show on map: blocks (for new-build apartments) or individual listings
  const useBlocksMap = useBlocksForApartments && blocks.length > 0;

  const loading =
    regionLoading ||
    (regionId != null &&
      (useBlocksMap
        ? blocksQuery.isPending || blocksQuery.isFetching
        : listingsQuery.isPending || listingsQuery.isFetching));

  const totalCount = useBlocksMap ? blocks.length : listingItems.length;
  const subtitle = isUnsupportedSeparateType
    ? 'Нет объявлений, добавьте первым'
    : loading ? 'Загрузка…' : `${totalCount} объектов на карте`;

  // Derive available objectType options from kindCounts
  const objectTypeOptions = useMemo(
    () => objectKindLinks.map((x) => x.type),
    [objectKindLinks],
  );

  const handleFiltersChange = useCallback(
    (next: CatalogFilters) => {
      setFilters(next);
      setSearchParams(
        (prev) => {
          const p = catalogFiltersIntoSearchParams(prev, next, finishingRowsForMap ?? undefined);
          if (regionId != null) p.set('region_id', String(regionId));
          return p;
        },
        { replace: true },
      );
    },
    [finishingRowsForMap, regionId, setSearchParams],
  );

  return (
    <div className="flex h-svh flex-col bg-background">
      <RedesignHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sidebar filters */}
        <aside className="hidden min-h-0 w-[280px] shrink-0 overflow-y-auto border-r border-border bg-background p-4 lg:block">
          <FilterSidebar
            filters={filters}
            onChange={handleFiltersChange}
            totalCount={totalCount}
            districtOptions={districtsQuery.data}
            subwayOptions={subwaysQuery.data}
            builderOptions={buildersQuery.data}
            deadlineOptions={deadlinesQuery.data}
            objectTypeOptions={objectTypeOptions.length > 0 ? objectTypeOptions : undefined}
            showMetro={isMoscowRegion}
            hasBlocks={useBlocksMap}
            finishingsReference={finishingRowsForMap ?? []}
          />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Map */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:min-w-0">
            <div className="mb-2 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
                  placeholder="Поиск по ЖК, адресу, району"
                  className="h-9 bg-background pl-9 text-sm"
                />
              </div>
              <span className="text-sm font-semibold sm:ml-auto">{subtitle}</span>
              <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
              </Button>
            </div>
            <div className="relative min-h-0 flex-1">
              {useBlocksMap ? (
                <MapSearch
                  complexes={blocks}
                  regionId={regionId}
                  regionCenter={regionCenter}
                  activeSlug={activeBlock}
                  onSelect={setActiveBlock}
                  height="100%"
                  compact
                />
              ) : (
                <ListingsMapSearch
                  listings={listingItems}
                  regionId={regionId}
                  regionCenter={regionCenter}
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
                            {c.priceFrom > 0 ? `от ${formatPrice(c.priceFrom)}` : 'Цена по запросу'}
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
                      <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        <img
                          src={l.photoUrl || LIVEGRID_LOGO_SRC}
                          alt=""
                          className={
                            l.photoUrl
                              ? 'h-full w-full object-cover'
                              : 'max-h-[70%] max-w-[70%] object-contain opacity-45'
                          }
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            if (el.getAttribute('data-lg-fallback')) return;
                            el.setAttribute('data-lg-fallback', '1');
                            el.onerror = null;
                            el.src = LIVEGRID_LOGO_SRC;
                            el.className = 'max-h-[70%] max-w-[70%] object-contain opacity-45';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="font-medium text-xs leading-snug line-clamp-2">
                          {l.title ?? l.address ?? `Объект #${l.id}`}
                        </p>
                        {l.address && l.title && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{l.address}</p>
                        )}
                        <p className="text-[11px] font-semibold text-primary mt-0.5">
                          {formatListingPriceFromApi(l.price)}
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
              onChange={handleFiltersChange}
              totalCount={totalCount}
              districtOptions={districtsQuery.data}
              subwayOptions={subwaysQuery.data}
              builderOptions={buildersQuery.data}
              deadlineOptions={deadlinesQuery.data}
              objectTypeOptions={objectTypeOptions.length > 0 ? objectTypeOptions : undefined}
                showMetro={isMoscowRegion}
              hasBlocks={useBlocksMap}
              finishingsReference={finishingRowsForMap ?? []}
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
