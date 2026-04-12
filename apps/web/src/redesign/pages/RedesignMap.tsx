import { useState, useMemo, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import MapSearch from '@/redesign/components/MapSearch';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { apiGet } from '@/lib/api';
import { complexes } from '@/redesign/data/mock-data';
import { defaultFilters, type CatalogFilters } from '@/redesign/data/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import { mapApiBlockListRowToResidentialComplex, type ApiBlockListRow } from '@/redesign/lib/blocks-from-api';
import { formatPrice } from '@/redesign/data/mock-data';
import { cn } from '@/lib/utils';

const PER_PAGE = 200;

const statusMap: Record<string, string> = { building: 'BUILDING', completed: 'COMPLETED', planned: 'PROJECT' };

const RedesignMap = () => {
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters });
  const [active, setActive] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: regionId, isLoading: regionLoading } = useDefaultRegionId();
  const deferredSearch = useDeferredValue(filters.search);

  const blocksQuery = useQuery({
    queryKey: [
      'blocks',
      'map',
      regionId,
      deferredSearch,
      filters.priceMin,
      filters.priceMax,
      filters.status,
      filters.district,
      filters.subway,
      filters.builder,
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
      if (filters.status.length === 1) {
        const apiStatus = statusMap[filters.status[0]];
        if (apiStatus) sp.set('status', apiStatus);
      }
      if (filters.district.length) sp.set('district_names', filters.district.join(','));
      if (filters.subway.length) sp.set('subway_names', filters.subway.join(','));
      if (filters.builder.length) sp.set('builder_names', filters.builder.join(','));
      return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
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

  const source = useMemo(() => {
    if (regionId == null) return complexes;
    if (blocksQuery.isError) return complexes;
    return rows;
  }, [regionId, blocksQuery.isError, rows]);

  const filtered = useMemo(() => {
    if (regionId != null && !blocksQuery.isError) return rows;
    return source.filter((c) => {
      const q = filters.search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.district.toLowerCase().includes(q) && !c.subway.toLowerCase().includes(q)) return false;
      if (filters.district.length && !filters.district.includes(c.district)) return false;
      if (filters.subway.length && !filters.subway.includes(c.subway)) return false;
      if (filters.builder.length && !filters.builder.includes(c.builder)) return false;
      return true;
    });
  }, [regionId, blocksQuery.isError, rows, source, filters.search, filters.district, filters.subway, filters.builder]);

  const loading = regionLoading || (regionId != null && blocksQuery.isPending);
  const subtitle = loading ? 'Загрузка…' : `${filtered.length} объектов на карте`;

  return (
    <div className="flex h-svh flex-col bg-background">
      <RedesignHeader />
      {/* Один экран под шапкой (h-16): фильтры | карта | список; боковые колонки со своим scroll */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden min-h-0 w-[280px] shrink-0 overflow-y-auto border-r border-border bg-background p-4 lg:block">
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            totalCount={filtered.length}
            districtOptions={districtsQuery.data}
            subwayOptions={subwaysQuery.data}
            builderOptions={buildersQuery.data}
          />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:min-w-0">
            <div className="mb-2 flex shrink-0 items-center justify-between lg:mb-3">
              <span className="text-sm font-semibold">{subtitle}</span>
              <Button variant="outline" size="sm" className="h-9 lg:hidden" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
              </Button>
            </div>
            {blocksQuery.isError && regionId != null && (
              <p className="mb-2 shrink-0 text-xs text-destructive">Карта: не удалось загрузить ЖК с API.</p>
            )}
            <div className="relative min-h-0 flex-1">
              <MapSearch
                complexes={filtered}
                activeSlug={active}
                onSelect={setActive}
                height="100%"
                compact
              />
            </div>
          </div>

          <aside
            className={cn(
              'flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-border bg-muted/20',
              'max-h-[40vh] lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0',
            )}
          >
            <div className="px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
              <p className="text-xs font-semibold text-foreground">Список ЖК</p>
              <p className="text-[10px] text-muted-foreground">Нажмите строку — метка на карте подсветится</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5 min-h-0">
              {loading ? (
                <p className="text-xs text-muted-foreground p-3">Загрузка…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Нет объектов по фильтрам.</p>
              ) : (
                filtered.map((c) => (
                  <div key={c.id} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setActive(c.slug === active ? null : c.slug)}
                      className={cn(
                        'flex-1 min-w-0 text-left flex gap-2.5 p-2 rounded-lg border transition-colors',
                        active === c.slug
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/60 bg-background hover:bg-muted/60',
                      )}
                    >
                      <img
                        src={c.images[0] || '/placeholder.svg'}
                        alt=""
                        className="w-14 h-11 rounded-md object-cover shrink-0 bg-muted"
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
              )}
            </div>
          </aside>
        </div>
      </div>

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
              totalCount={filtered.length}
              districtOptions={districtsQuery.data}
              subwayOptions={subwaysQuery.data}
              builderOptions={buildersQuery.data}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>
              Показать {filtered.length} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignMap;
