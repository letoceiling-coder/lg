import { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import MapSearch from '@/redesign/components/MapSearch';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { defaultFilters, type CatalogFilters, type ObjectType, type MarketType } from '@/redesign/data/types';

type ViewMode = 'grid' | 'list' | 'map';

const PER_PAGE = 48;

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
  const [page, setPage] = useState(1);

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

  const statusMap: Record<string, string> = { building: 'BUILDING', completed: 'COMPLETED', planned: 'PROJECT' };

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, regionId, filters.priceMin, filters.priceMax, filters.status, filters.objectType, filters.district, filters.subway, filters.builder]);

  const blocksQuery = useQuery({
    queryKey: ['blocks', 'catalog', regionId, deferredSearch, page, filters.priceMin, filters.priceMax, filters.status, filters.objectType, filters.district, filters.subway, filters.builder],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('region_id', String(regionId));
      if (deferredSearch.trim()) sp.set('search', deferredSearch.trim());
      sp.set('page', String(page));
      sp.set('per_page', String(PER_PAGE));
      if (filters.priceMin) sp.set('price_min', String(filters.priceMin));
      if (filters.priceMax) sp.set('price_max', String(filters.priceMax));
      if (filters.status.length === 1) {
        const apiStatus = statusMap[filters.status[0]];
        if (apiStatus) sp.set('status', apiStatus);
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (filters.subway.length) sp.set('subway_names', filters.subway.join(','));
      if (filters.builder.length) sp.set('builder_names', filters.builder.join(','));
      return apiGet<{ data: ApiBlockListRow[]; meta: { total: number; total_pages: number } }>(`/blocks?${sp}`);
    },
    enabled: regionId != null,
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
    () => blocksQuery.data?.data.map(mapApiBlockListRowToResidentialComplex) ?? [],
    [blocksQuery.data],
  );

  const filtered = rows;

  const handleFiltersChange = useCallback(
    (f: CatalogFilters) => {
      setFilters(f);
      setPage(1);
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.rooms.length) params.set('rooms', f.rooms.join(','));
      if (f.objectType !== 'apartments') params.set('type', f.objectType);
      if (f.marketType !== 'all') params.set('market', f.marketType);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const totalRemote = blocksQuery.data?.meta.total;
  const totalPages = blocksQuery.data?.meta.total_pages ?? 1;
  const loading = regionLoading || (regionId != null && blocksQuery.isPending);
  const loadError = blocksQuery.isError;

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
            <h1 className="text-lg font-bold">Жилые комплексы</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? 'Загрузка…' : loadError ? 'Ошибка загрузки' : `${filtered.length} на странице${totalRemote != null ? ` · всего ${totalRemote}` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden h-9" onClick={() => setShowMobileFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
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
                {filtered.map((c) => (
                  <ComplexCard key={c.id} complex={c} />
                ))}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-3">
                {filtered.map((c) => (
                  <ComplexCard key={c.id} complex={c} variant="list" />
                ))}
              </div>
            )}
            {view === 'map' && (
              <div className="h-[calc(100vh-220px)] min-h-[400px]">
                <MapSearch complexes={filtered} activeSlug={mapActive} onSelect={setMapActive} compact />
              </div>
            )}
            {totalPages > 1 && view !== 'map' && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Назад
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Вперёд
                </Button>
              </div>
            )}
            {!loading && filtered.length === 0 && view !== 'map' && (
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
              Показать {filtered.length} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignCatalog;
