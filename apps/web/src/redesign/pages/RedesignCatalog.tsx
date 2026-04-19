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
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
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

function parseCatalogSort(raw: string | null): CatalogSort {
  if (raw && (CATALOG_SORT_VALUES as readonly string[]).includes(raw)) {
    return raw as CatalogSort;
  }
  return 'name_asc';
}

const RedesignCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilters = useMemo((): CatalogFilters => {
    const f = { ...defaultFilters };
    f.search = searchParams.get('search') || '';
    const rooms = searchParams.get('rooms');
    if (rooms) f.rooms = rooms.split(',').map(Number);
    const type = searchParams.get('type');
    if (type && ['apartments', 'houses', 'land', 'commercial'].includes(type)) {
      f.objectType = type as ObjectType;
    }
    const market = searchParams.get('market');
    if (market && ['new', 'secondary'].includes(market)) {
      f.marketType = market as MarketType;
    }
    return f;
  }, []);

  const [view, setView] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<CatalogFilters>(initialFilters);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapActive, setMapActive] = useState<string | null>(null);
  const { data: defaultRegionId, setStoredRegionId } = useDefaultRegionId();
  const urlRegionIdRaw = searchParams.get('region_id');
  const urlRegionId = urlRegionIdRaw ? parseInt(urlRegionIdRaw, 10) : NaN;
  const regionId =
    Number.isFinite(urlRegionId) && urlRegionId > 0 ? urlRegionId : defaultRegionId;

  useEffect(() => {
    if (Number.isFinite(urlRegionId) && urlRegionId > 0) {
      setStoredRegionId(urlRegionId);
    }
  }, [urlRegionId, setStoredRegionId]);

  const geoPreset = searchParams.get('geo_preset') ?? undefined;
  const geoPolygon = searchParams.get('geo_polygon') ?? undefined;
  const geoLat = searchParams.get('geo_lat');
  const geoLng = searchParams.get('geo_lng');
  const geoRadius = searchParams.get('geo_radius_m');

  const typeParam = searchParams.get('type');
  const searchParam = searchParams.get('search');
  useEffect(() => {
    if (typeParam && ['apartments', 'houses', 'land', 'commercial'].includes(typeParam)) {
      setFilters((f) => ({ ...f, objectType: typeParam as ObjectType }));
    }
    if (searchParam) setFilters((f) => ({ ...f, search: searchParam }));
  }, [typeParam, searchParam]);

  const regionLoading = regionId == null;
  const deferredSearch = useDeferredValue(filters.search);
  const catalogSort = parseCatalogSort(searchParams.get('sort'));

  const statusMap: Record<string, string> = { building: 'BUILDING', completed: 'COMPLETED', planned: 'PROJECT' };
  const isApartmentMode = filters.objectType === 'apartments';
  const listingKind = !isApartmentMode ? OBJECT_TYPE_KIND[filters.objectType] : null;
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
    enabled: !isApartmentMode && regionId != null,
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
      filters.status,
      filters.objectType,
      filters.district,
      filters.subway,
      filters.builder,
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
      if (filters.status.length === 1) {
        const apiStatus = statusMap[filters.status[0]];
        if (apiStatus) sp.set('status', apiStatus);
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (filters.subway.length) sp.set('subway_names', filters.subway.join(','));
      if (filters.builder.length) sp.set('builder_names', filters.builder.join(','));
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
    enabled: isApartmentMode && regionId != null,
  });

  const districtsQuery = useQuery({
    queryKey: ['districts', regionId],
    queryFn: () => apiGet<{ name: string }[]>(`/districts?region_id=${regionId}`),
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
    enabled: regionId != null,
    select: (r) => r.map((x) => x.name),
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
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (f.search) params.set('search', f.search);
        else params.delete('search');
        if (f.rooms.length) params.set('rooms', f.rooms.join(','));
        else params.delete('rooms');
        if (f.objectType !== 'apartments') params.set('type', f.objectType);
        else params.delete('type');
        if (f.marketType !== 'all') params.set('market', f.marketType);
        else params.delete('market');
        return params;
      }, { replace: true });
    },
    [setSearchParams],
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

  const totalRemote = isApartmentMode
    ? blocksInfinite.data?.pages[0]?.meta.total
    : listingsInfinite.data?.pages[0]?.meta.total;
  const loading = regionLoading
    || (isApartmentMode && regionId != null && blocksInfinite.isPending && !blocksInfinite.data)
    || (!isApartmentMode && regionId != null && listingsInfinite.isPending && !listingsInfinite.data);
  const loadError = isApartmentMode ? blocksInfinite.isError : listingsInfinite.isError;
  const hasMore = isApartmentMode ? Boolean(blocksInfinite.hasNextPage) : Boolean(listingsInfinite.hasNextPage);
  const fetchingMore = isApartmentMode ? blocksInfinite.isFetchingNextPage : listingsInfinite.isFetchingNextPage;
  const totalShown = isApartmentMode ? filtered.length : listingRows.length;
  const fetchNext = () => {
    if (isApartmentMode) void blocksInfinite.fetchNextPage();
    else void listingsInfinite.fetchNextPage();
  };

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
              to="/map"
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
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loadError && (
              <p className="text-sm text-destructive mb-4">Не удалось загрузить каталог. Проверьте API и прокси /api.</p>
            )}
            {view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {isApartmentMode
                  ? filtered.map((c) => <ComplexCard key={c.id} complex={c} />)
                  : listingRows.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-3">
                {isApartmentMode
                  ? filtered.map((c) => <ComplexCard key={c.id} complex={c} variant="list" />)
                  : listingRows.map((l) => <ListingCard key={l.id} listing={l} variant="list" />)}
              </div>
            )}
            {view === 'map' && isApartmentMode && (
              <div className="h-[calc(100vh-220px)] min-h-[400px]">
                <MapSearch complexes={filtered} activeSlug={mapActive} onSelect={setMapActive} compact />
              </div>
            )}
            {view === 'map' && !isApartmentMode && (
              <div className="h-[calc(100vh-220px)] min-h-[400px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Карта пока доступна только для жилых комплексов
              </div>
            )}
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
                <p className="text-muted-foreground text-xs">Попробуйте изменить параметры фильтров или строку поиска</p>
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
