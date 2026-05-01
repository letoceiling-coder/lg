import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import ListingCard, { type ApiListingCardRow } from '@/redesign/components/ListingCard';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import MapSearch from '@/redesign/components/MapSearch';
import ListingsMapSearch, { type ListingMapItem } from '@/redesign/components/ListingsMapSearch';
import { useDefaultRegionId, type RegionRow } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import {
  catalogFilterUrlSignature,
  catalogFiltersFromSearchParams,
  catalogFiltersIntoSearchParams,
  finishingIdsFromSidebarLabels,
} from '@/redesign/lib/catalog-url-sync';
import { defaultFilters, type CatalogFilters, type ObjectType, type MarketType } from '@/redesign/data/types';

const OBJECT_TYPE_TITLE: Record<ObjectType, string> = {
  apartments: 'Жилые комплексы',
  houses: 'Дома',
  land: 'Участки',
  commercial: 'Коммерческая недвижимость',
};

const OBJECT_TYPE_KIND: Record<Exclude<ObjectType, 'apartments'>, 'HOUSE' | 'LAND' | 'COMMERCIAL'> = {
  houses: 'HOUSE',
  land: 'LAND',
  commercial: 'COMMERCIAL',
};

type ViewMode = 'grid' | 'list' | 'map';

const PER_PAGE = 20;

const CATALOG_SORT_VALUES = [
  'name_asc',
  'name_desc',
  'created_desc',
  'price_asc',
  'price_desc',
  'sales_start_asc',
] as const;
type CatalogSort = (typeof CATALOG_SORT_VALUES)[number];

function normalizeCitySlug(raw: string | null): string {
  return (raw ?? '').trim().toLowerCase();
}

function resolveRegionIdByCityParam(rows: RegionRow[] | undefined, cityRaw: string | null): number | null {
  if (!rows?.length) return null;
  const city = normalizeCitySlug(cityRaw);
  if (!city) return null;
  const byCode = rows.find((r) => (r.code ?? '').trim().toLowerCase() === city);
  if (byCode) return byCode.id;
  const byName = rows.find((r) => (r.name ?? '').trim().toLowerCase() === city);
  if (byName) return byName.id;
  return null;
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

function parseCatalogSort(raw: string | null): CatalogSort {
  if (raw && (CATALOG_SORT_VALUES as readonly string[]).includes(raw)) {
    return raw as CatalogSort;
  }
  return 'name_asc';
}

const RedesignCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ ...defaultFilters }));
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapActive, setMapActive] = useState<string | null>(null);
  const [mapActiveListing, setMapActiveListing] = useState<number | null>(null);
  const { data: defaultRegionId, rows: regionRows, setStoredRegionId } = useDefaultRegionId();
  const urlRegionIdRaw = searchParams.get('region_id');
  const urlRegionId = urlRegionIdRaw ? parseInt(urlRegionIdRaw, 10) : NaN;
  const cityParam = searchParams.get('city');
  const cityRegionId = useMemo(
    () => resolveRegionIdByCityParam(regionRows, cityParam),
    [regionRows, cityParam],
  );
  const regionId =
    Number.isFinite(urlRegionId) && urlRegionId > 0
      ? urlRegionId
      : (cityRegionId ?? defaultRegionId);
  const regionCenter = useMemo(
    () => regionCenterFromRow(regionRows?.find((r) => r.id === regionId)),
    [regionId, regionRows],
  );

  useEffect(() => {
    if (Number.isFinite(urlRegionId) && urlRegionId > 0) {
      if (defaultRegionId !== urlRegionId) {
        setStoredRegionId(urlRegionId);
      }
      return;
    }
    if (cityRegionId != null && cityRegionId !== defaultRegionId) {
      setStoredRegionId(cityRegionId);
    }
  }, [urlRegionId, cityRegionId, defaultRegionId, setStoredRegionId]);

  const geoPreset = searchParams.get('geo_preset') ?? undefined;
  const geoPolygon = searchParams.get('geo_polygon') ?? undefined;
  const geoLat = searchParams.get('geo_lat');
  const geoLng = searchParams.get('geo_lng');
  const geoRadius = searchParams.get('geo_radius_m');

  const { data: finishingRows } = useQuery({
    queryKey: ['reference', 'finishings'],
    queryFn: () => apiGet<Array<{ id: number; name: string }>>('/reference/finishings'),
    staleTime: 60 * 60 * 1000,
  });

  const catalogUrlSig = useMemo(
    () => catalogFilterUrlSignature(new URLSearchParams(searchParams)),
    [searchParams.toString()],
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setFilters(catalogFiltersFromSearchParams(sp, finishingRows ?? undefined));
  }, [catalogUrlSig, finishingRows]);

  const regionLoading = regionId == null;
  const deferredSearch = useDeferredValue(filters.search);
  const catalogSort = parseCatalogSort(searchParams.get('sort'));

  const statusMap: Record<string, string> = { building: 'BUILDING', completed: 'COMPLETED', planned: 'PROJECT' };
  const isApartmentMode = filters.objectType === 'apartments';
  const useBlocksCatalog = isApartmentMode && filters.marketType !== 'secondary';
  const listingKind = !isApartmentMode ? OBJECT_TYPE_KIND[filters.objectType] : 'APARTMENT';
  const pageTitle = OBJECT_TYPE_TITLE[filters.objectType] ?? OBJECT_TYPE_TITLE.apartments;

  const listingsInfinite = useInfiniteQuery({
    queryKey: [
      'listings',
      'catalog',
      'infinite',
      regionId,
      listingKind,
      deferredSearch,
      filters.priceMin,
      filters.priceMax,
      filters.rooms,
      filters.areaMin,
      filters.areaMax,
      filters.floorMin,
      filters.floorMax,
      filters.finishing,
      filters.district,
      filters.marketType,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams();
      if (regionId != null) sp.set('region_id', String(regionId));
      if (listingKind) sp.set('kind', listingKind);
      sp.set('statuses', 'ACTIVE,RESERVED');
      sp.set('is_published', 'true');
      sp.set('page', String(pageParam));
      sp.set('per_page', String(PER_PAGE));
      if (deferredSearch.trim()) sp.set('search', deferredSearch.trim());
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));
      if (filters.areaMin) sp.set('area_total_min', String(filters.areaMin));
      if (filters.areaMax) sp.set('area_total_max', String(filters.areaMax));
      if (filters.floorMin) sp.set('floor_min', String(filters.floorMin));
      if (filters.floorMax) sp.set('floor_max', String(filters.floorMax));
      if (listingKind === 'APARTMENT' && filters.finishing.length && finishingRows?.length) {
        const fid = finishingIdsFromSidebarLabels(filters.finishing, finishingRows);
        if (fid.length) sp.set('finishing', fid.join(','));
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (listingKind === 'APARTMENT') {
        if (filters.marketType === 'secondary') sp.set('apartment_market', 'secondary');
        else if (filters.marketType === 'new') sp.set('apartment_market', 'new_building');
      }
      return apiGet<{
        data: ApiListingCardRow[];
        meta: { page: number; per_page: number; total: number; total_pages: number };
      }>(`/listings?${sp}`);
    },
    getNextPageParam: (lastPage) => {
      const { page, total_pages: totalPages } = lastPage.meta;
      if (page >= totalPages) return undefined;
      return page + 1;
    },
    enabled: regionId != null,
  });

  // Flat (non-paginated) query for map view showing individual listings
  const listingsMapQuery = useQuery({
    queryKey: ['listings', 'catalog', 'map', regionId, listingKind, deferredSearch, filters.priceMin, filters.priceMax, filters.rooms, filters.areaMin, filters.areaMax, filters.floorMin, filters.floorMax, filters.finishing, filters.district, filters.marketType],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (regionId != null) sp.set('region_id', String(regionId));
      if (listingKind) sp.set('kind', listingKind);
      sp.set('statuses', 'ACTIVE,RESERVED');
      sp.set('is_published', 'true');
      sp.set('page', '1');
      sp.set('per_page', '200');
      if (deferredSearch.trim()) sp.set('search', deferredSearch.trim());
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));
      if (filters.areaMin) sp.set('area_total_min', String(filters.areaMin));
      if (filters.areaMax) sp.set('area_total_max', String(filters.areaMax));
      if (filters.floorMin) sp.set('floor_min', String(filters.floorMin));
      if (filters.floorMax) sp.set('floor_max', String(filters.floorMax));
      if (listingKind === 'APARTMENT' && filters.finishing.length && finishingRows?.length) {
        const fid = finishingIdsFromSidebarLabels(filters.finishing, finishingRows);
        if (fid.length) sp.set('finishing', fid.join(','));
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (listingKind === 'APARTMENT') {
        if (filters.marketType === 'secondary') sp.set('apartment_market', 'secondary');
        else if (filters.marketType === 'new') sp.set('apartment_market', 'new_building');
      }
      return apiGet<{ data: ApiListingCardRow[] }>(`/listings?${sp}`);
    },
    enabled: regionId != null && view === 'map',
    staleTime: 2 * 60 * 1000,
  });

  const blocksInfinite = useInfiniteQuery({
    queryKey: [
      'blocks',
      'catalog',
      'infinite',
      regionId,
      deferredSearch,
      catalogSort,
      filters.priceMin,
      filters.priceMax,
      filters.areaMin,
      filters.areaMax,
      filters.floorMin,
      filters.floorMax,
      filters.deadline,
      filters.status,
      filters.objectType,
      filters.marketType,
      filters.district,
      filters.subway,
      filters.builder,
      filters.rooms,
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      if (deferredSearch.trim()) sp.set('search', deferredSearch.trim());
      sp.set('page', String(pageParam));
      sp.set('per_page', String(PER_PAGE));
      sp.set('sort', catalogSort);
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.areaMin != null) sp.set('area_min', String(filters.areaMin));
      if (filters.areaMax != null) sp.set('area_max', String(filters.areaMax));
      if (filters.floorMin != null) sp.set('floor_min', String(filters.floorMin));
      if (filters.floorMax != null) sp.set('floor_max', String(filters.floorMax));
      if (filters.deadline.length) sp.set('deadline', filters.deadline.join(','));
      if (filters.marketType === 'new') {
        sp.set('status', 'BUILDING');
      } else if (filters.status.length === 1) {
        const apiStatus = statusMap[filters.status[0]];
        if (apiStatus) sp.set('status', apiStatus);
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (filters.subway.length) sp.set('subway_names', filters.subway.join(','));
      if (filters.builder.length) sp.set('builder_names', filters.builder.join(','));
      if (filters.rooms.length) sp.set('rooms', filters.rooms.join(','));
      if (geoPreset) sp.set('geo_preset', geoPreset);
      if (geoPolygon) sp.set('geo_polygon', geoPolygon);
      if (geoLat && geoLng && geoRadius) {
        sp.set('geo_lat', geoLat);
        sp.set('geo_lng', geoLng);
        sp.set('geo_radius_m', geoRadius);
      }
      return apiGet<{
        data: ApiBlockListRow[];
        meta: { page: number; per_page: number; total: number; total_pages: number };
      }>(`/blocks?${sp}`);
    },
    getNextPageParam: (lastPage) => {
      const { page, total_pages: totalPages } = lastPage.meta;
      if (page >= totalPages) return undefined;
      return page + 1;
    },
    enabled: useBlocksCatalog && regionId != null,
  });

  // Pass listing kind to districts query so only relevant districts are shown
  const districtKind = listingKind ?? 'APARTMENT';
  const districtsQuery = useQuery({
    queryKey: ['districts', regionId, districtKind],
    queryFn: () => apiGet<{ name: string }[]>(`/districts?region_id=${regionId}&kind=${districtKind}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const kindCountsQuery = useQuery({
    queryKey: ['stats', 'listing-kind-counts', regionId],
    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId}`),
    enabled: regionId != null,
    staleTime: 60_000,
  });

  const kindCounts = kindCountsQuery.data ?? {};
  const availableKindLinks = useMemo(() => {
    const items: { type: ObjectType; label: string; count: number }[] = [
      { type: 'apartments', label: 'Квартиры', count: kindCounts.APARTMENT ?? 0 },
      { type: 'houses', label: 'Дома и дачи', count: kindCounts.HOUSE ?? 0 },
      { type: 'land', label: 'Участки', count: kindCounts.LAND ?? 0 },
      { type: 'commercial', label: 'Коммерция', count: kindCounts.COMMERCIAL ?? 0 },
    ];
    return items.filter((x) => x.count > 0);
  }, [kindCounts]);

  const showKindSwitcher = availableKindLinks.length >= 2 && availableKindLinks.some((x) => x.type !== filters.objectType);

  const subwaysQuery = useQuery({
    queryKey: ['subways', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/subways?region_id=${regionId}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const buildersQuery = useQuery({
    queryKey: ['builders', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/builders?region_id=${regionId}`),
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
  });

  const deadlinesQuery = useQuery({
    queryKey: ['blocks', 'deadlines', regionId],
    queryFn: () => apiGet<string[]>(`/blocks/deadlines?region_id=${regionId ?? 1}`),
    enabled: Boolean(regionId),
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(
    () =>
      blocksInfinite.data?.pages.flatMap((p) => p.data).map(mapApiBlockListRowToResidentialComplex) ?? [],
    [blocksInfinite.data],
  );

  const listingRows = useMemo<ApiListingCardRow[]>(
    () => listingsInfinite.data?.pages.flatMap((p) => p.data) ?? [],
    [listingsInfinite.data],
  );

  const filtered = rows;

  const handleFiltersChange = useCallback(
    (f: CatalogFilters) => {
      setFilters(f);
      setSearchParams(
        (prev) => catalogFiltersIntoSearchParams(prev, f, finishingRows ?? undefined),
        { replace: true },
      );
    },
    [setSearchParams, finishingRows],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const next = parseCatalogSort(value);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'name_asc') p.delete('sort');
        else p.set('sort', next);
        return p;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const blocksTotal = blocksInfinite.data?.pages[0]?.meta.total ?? 0;
  const listingsTotal = listingsInfinite.data?.pages[0]?.meta.total ?? 0;
  // Если выбран режим «Квартиры», но в регионе нет ЖК — показываем standalone APARTMENT-объявления.
  const apartmentsAsListings = isApartmentMode && (!useBlocksCatalog || (blocksInfinite.isFetched && blocksTotal === 0 && listingsTotal > 0));
  const showBlocks = useBlocksCatalog && !apartmentsAsListings;

  const totalRemote = showBlocks ? blocksTotal : listingsTotal;

  function getListingCardPhoto(l: ApiListingCardRow): string | null {
    const extras = l.apartment?.extraPhotoUrls;
    if (Array.isArray(extras) && extras.length) return extras[0] as string;
    if (l.house?.photoUrl) return l.house.photoUrl;
    const hExtras = l.house?.extraPhotoUrls;
    if (Array.isArray(hExtras) && hExtras.length) return hExtras[0] as string;
    if (l.land?.photoUrl) return l.land.photoUrl;
    if (l.commercial) return null;
    return null;
  }
  const loading = regionLoading
    || (showBlocks && blocksInfinite.isPending && !blocksInfinite.data)
    || (!showBlocks && listingsInfinite.isPending && !listingsInfinite.data);
  const loadError = showBlocks ? blocksInfinite.isError : listingsInfinite.isError;
  const hasMore = showBlocks ? Boolean(blocksInfinite.hasNextPage) : Boolean(listingsInfinite.hasNextPage);
  const fetchingMore = showBlocks ? blocksInfinite.isFetchingNextPage : listingsInfinite.isFetchingNextPage;
  const totalShown = showBlocks ? filtered.length : listingRows.length;
  const fetchNext = () => {
    if (showBlocks) void blocksInfinite.fetchNextPage();
    else void listingsInfinite.fetchNextPage();
  };

  const mapHref = useMemo(() => {
    const params = new URLSearchParams();
    if (regionId != null) params.set('region_id', String(regionId));
    if (filters.objectType !== 'apartments') params.set('type', filters.objectType);
    if (filters.marketType !== 'all') params.set('market', filters.marketType);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    return `/map${params.toString() ? `?${params.toString()}` : ''}`;
  }, [filters.marketType, filters.objectType, filters.search, regionId]);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="border-b border-border bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center gap-3 max-w-[800px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Метро, район, ЖК, улица, застройщик"
                className="pl-9 h-10 bg-background text-sm"
                value={filters.search}
                onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
              />
            </div>
            <Link
              to={mapHref}
              className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border bg-background text-sm font-medium hover:bg-secondary transition-colors shrink-0"
            >
              <MapPin className="w-4 h-4 text-primary" />
              На карте
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading
                ? 'Загрузка…'
                : loadError
                  ? 'Ошибка загрузки'
                  : `${totalShown} загружено${totalRemote != null ? ` · всего в каталоге ${totalRemote}` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="lg:hidden h-9" onClick={() => setShowMobileFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
            <Select value={catalogSort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-9 w-[min(200px,42vw)] sm:w-[220px] text-xs bg-background">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Название А—Я</SelectItem>
                <SelectItem value="name_desc">Название Я—А</SelectItem>
                <SelectItem value="created_desc">Сначала новые по дате</SelectItem>
                <SelectItem value="price_asc">Цена: сначала дешевле</SelectItem>
                <SelectItem value="price_desc">Цена: сначала дороже</SelectItem>
                <SelectItem value="sales_start_asc">Старт продаж (раньше)</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden sm:flex items-center gap-0.5 border border-border rounded-xl p-1 bg-muted/50">
              {(
                [
                  ['grid', LayoutGrid, 'Плитка'],
                  ['list', List, 'Список'],
                  ['map', Map, 'Карта'],
                ] as const
              ).map(([mode, Icon, title]) => (
                <button
                  key={mode}
                  title={title}
                  type="button"
                  onClick={() => setView(mode)}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    view === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {!regionId && !regionLoading && (
          <p className="text-sm text-muted-foreground mb-4">Нет регионов в базе — добавьте регион и ЖК в админке.</p>
        )}

        {showKindSwitcher && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">В этом регионе доступно:</span>
            {availableKindLinks.map((x) => (
              <button
                key={x.type}
                type="button"
                onClick={() => {
                  if (x.type === filters.objectType) return;
                  handleFiltersChange({
                    objectType: x.type,
                    marketType: 'all',
                    search: filters.search,
                    priceMin: filters.priceMin,
                    priceMax: filters.priceMax,
                    rooms: [],
                    areaMin: undefined,
                    areaMax: undefined,
                    floorMin: undefined,
                    floorMax: undefined,
                    deadline: [],
                    finishing: [],
                    status: [],
                    subway: [],
                    builder: [],
                    district: [],
                  });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                  filters.objectType === x.type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted/60',
                )}
              >
                {x.label}
                <span className="opacity-70">({x.count})</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div className="sticky top-20">
              <FilterSidebar
                filters={filters}
                onChange={handleFiltersChange}
                totalCount={filtered.length}
                districtOptions={districtsQuery.data}
                subwayOptions={subwaysQuery.data}
                builderOptions={buildersQuery.data}
                deadlineOptions={deadlinesQuery.data}
                objectTypeOptions={availableKindLinks.length > 0 ? availableKindLinks.map(x => x.type) : undefined}
                hasBlocks={showBlocks}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loadError && (
              <p className="text-sm text-destructive mb-4">Не удалось загрузить каталог. Проверьте API и прокси /api.</p>
            )}
            {apartmentsAsListings && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span className="mt-0.5">ℹ️</span>
                <span>
                  В этом регионе пока нет жилых комплексов. Показываем отдельные квартиры от собственников и агентств.
                </span>
              </div>
            )}
            {view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                {showBlocks
                  ? filtered.map((c) => <ComplexCard key={c.id} complex={c} />)
                  : listingRows.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-3">
                {showBlocks
                  ? filtered.map((c) => <ComplexCard key={c.id} complex={c} variant="list" />)
                  : listingRows.map((l) => <ListingCard key={l.id} listing={l} variant="list" />)}
              </div>
            )}
            {view === 'map' && showBlocks && (
              <div className="h-[calc(100vh-220px)] min-h-[400px]">
                <MapSearch
                  complexes={filtered}
                  regionId={regionId}
                  regionCenter={regionCenter}
                  activeSlug={mapActive}
                  onSelect={setMapActive}
                  compact
                />
              </div>
            )}
            {view === 'map' && !showBlocks && (() => {
              const mapData = listingsMapQuery.data?.data ?? listingRows;
              const useApproximateCoords = filters.objectType === 'apartments' && filters.marketType === 'secondary';
              const mapItems: ListingMapItem[] = mapData
                .map((l, index) => {
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
                    photoUrl: getListingCardPhoto(l),
                  };
                })
                .filter((l): l is ListingMapItem => l != null);
              if (mapItems.length === 0) {
                return (
                  <div className="h-[calc(100vh-220px)] min-h-[400px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
                    <span className="text-2xl">🗺️</span>
                    <p className="font-medium text-foreground">Нет объектов с координатами для отображения на карте</p>
                    <button onClick={() => setView('grid')} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                      Показать плиткой
                    </button>
                  </div>
                );
              }
              return (
                <div className="h-[calc(100vh-220px)] min-h-[400px]">
                  <ListingsMapSearch
                    listings={mapItems}
                    regionId={regionId}
                    regionCenter={regionCenter}
                    activeId={mapActiveListing}
                    onSelect={setMapActiveListing}
                    compact
                  />
                </div>
              );
            })()}
            {view !== 'map' && totalShown > 0 && (
              <div className="flex flex-col items-center gap-2 mt-8">
                {hasMore ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[200px]"
                    disabled={fetchingMore}
                    onClick={fetchNext}
                  >
                    {fetchingMore ? 'Загрузка…' : 'Показать ещё'}
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Показано {totalShown}
                  {totalRemote != null ? ` из ${totalRemote}` : ''}
                </p>
              </div>
            )}
            {!loading && totalShown === 0 && view !== 'map' && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-1">Ничего не найдено</p>
                <p className="text-muted-foreground text-xs mb-4">Попробуйте изменить параметры фильтров или строку поиска</p>
                {availableKindLinks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 justify-center">
                    {availableKindLinks
                      .filter((x) => x.type !== filters.objectType)
                      .map((x) => (
                        <button
                          key={x.type}
                          type="button"
                          onClick={() => handleFiltersChange({ ...filters, objectType: x.type })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-primary text-primary hover:bg-primary/10"
                        >
                          Открыть «{x.label}» ({x.count})
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold text-sm">Фильтры</span>
            <button type="button" onClick={() => setShowMobileFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar
              filters={filters}
              onChange={handleFiltersChange}
              totalCount={filtered.length}
              districtOptions={districtsQuery.data}
              subwayOptions={subwaysQuery.data}
              builderOptions={buildersQuery.data}
              deadlineOptions={deadlinesQuery.data}
              objectTypeOptions={availableKindLinks.length > 0 ? availableKindLinks.map(x => x.type) : undefined}
              hasBlocks={showBlocks}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-11" onClick={() => setShowMobileFilters(false)}>
              Показать {totalShown} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignCatalog;
