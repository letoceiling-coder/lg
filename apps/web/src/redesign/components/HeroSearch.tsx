import { useState, useRef, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Building2, Home, TreePine, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { useDefaultRegionId } from '@/redesign/hooks/useDefaultRegionId';
import CatalogSearchHintsDropdown from '@/redesign/components/CatalogSearchHintsDropdown';
import type { CatalogHints } from '@/redesign/lib/catalog-hints-types';

type RoomTypeRow = { id: number; name: string };

/** Числа 1–999 считаем миллионами ₽ (как на витринах); от 1 000 000 — рублями. */
function priceRubFromHeroInput(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n < 1_000_000) return n * 1_000_000;
  return n;
}

function roomTypeIdsForPropertyLabel(label: string, roomTypes: RoomTypeRow[]): string | undefined {
  if (!label || label === 'Тип квартиры') return undefined;
  const lower = label.toLowerCase();
  const pick = (ids: number[]) => (ids.length ? ids.join(',') : undefined);
  if (lower.includes('студ')) {
    return pick(roomTypes.filter((r) => r.name.toLowerCase().includes('студ')).map((r) => r.id));
  }
  if (lower.includes('4+') || lower.includes('4 +')) {
    return pick(
      roomTypes
        .filter((r) => {
          const n = r.name.toLowerCase();
          return (
            n.includes('4') ||
            n.includes('5') ||
            n.includes('6') ||
            n.includes('многокомн') ||
            n.includes('5+') ||
            n.includes('4-к')
          );
        })
        .map((r) => r.id),
    );
  }
  const m = label.match(/(\d)/);
  if (m) {
    const d = m[1];
    return pick(
      roomTypes
        .filter((r) => {
          const n = r.name.toLowerCase();
          if (n.includes('студ')) return false;
          return n.includes(`${d}-комн`) || n.includes(`${d} комн`) || n.includes(`${d}-к`) || n.includes(` ${d} `);
        })
        .map((r) => r.id),
    );
  }
  return undefined;
}

const objectTabs = [
  { label: 'Квартиры', icon: Building2, value: 'apartments', kind: 'APARTMENT' as const },
  { label: 'Дома', icon: Home, value: 'houses', kind: 'HOUSE' as const },
  { label: 'Участки', icon: TreePine, value: 'land', kind: 'LAND' as const },
  { label: 'Коммерция', icon: Store, value: 'commercial', kind: 'COMMERCIAL' as const },
];

const propertyTypes = ['Тип квартиры', 'Студия', '1-комнатная', '2-комнатная', '3-комнатная', '4+ комнат'];
const deadlines = ['Срок сдачи', 'Сдан', '2026', '2027', '2028', '2029+'];

const HeroSearch = () => {
  const [activeTab, setActiveTab] = useState('apartments');
  const [q, setQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [propertyType, setPropertyType] = useState('Тип квартиры');
  const [ptOpen, setPtOpen] = useState(false);
  const [deadline, setDeadline] = useState('Срок сдачи');
  const [dlOpen, setDlOpen] = useState(false);
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedForCounts, setDebouncedForCounts] = useState({
    q: '',
    priceFrom: '',
    priceTo: '',
    propertyType: 'Тип квартиры',
    deadline: 'Срок сдачи',
  });

  const navigate = useNavigate();
  const { data: regionId, rows: regionRows, setStoredRegionId } = useDefaultRegionId();
  const deferredSearch = useDeferredValue(q.trim());
  const hintsEnabled =
    activeTab === 'apartments' && searchFocused && deferredSearch.length >= 2 && regionId != null;

  const { data: catalogHints, isFetching: hintsLoading } = useQuery({
    queryKey: ['search', 'catalog-hints', regionId, deferredSearch],
    queryFn: () =>
      apiGet<CatalogHints>(
        `/search/catalog-hints?region_id=${regionId}&q=${encodeURIComponent(deferredSearch)}&limit=30`,
      ),
    enabled: hintsEnabled,
    staleTime: 20_000,
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['reference', 'room-types'],
    queryFn: () => apiGet<RoomTypeRow[]>('/reference/room-types'),
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedForCounts({ q, priceFrom, priceTo, propertyType, deadline }),
      450,
    );
    return () => clearTimeout(t);
  }, [q, priceFrom, priceTo, propertyType, deadline]);

  const catalogCountParams = useMemo(() => {
    if (regionId == null || activeTab !== 'apartments') return null;
    const sp = new URLSearchParams();
    sp.set('region_id', String(regionId));
    const qs = debouncedForCounts.q.trim();
    if (qs) sp.set('search', qs);
    const pMin = priceRubFromHeroInput(debouncedForCounts.priceFrom);
    const pMax = priceRubFromHeroInput(debouncedForCounts.priceTo);
    if (pMin != null) sp.set('price_min', String(pMin));
    if (pMax != null) sp.set('price_max', String(pMax));
    if (debouncedForCounts.deadline === 'Сдан') sp.set('status', 'COMPLETED');
    const rt = roomTypeIdsForPropertyLabel(debouncedForCounts.propertyType, roomTypes);
    if (rt) sp.set('room_type_ids', rt);
    return sp.toString();
  }, [regionId, activeTab, debouncedForCounts, roomTypes]);

  const { data: catalogStats } = useQuery({
    queryKey: ['blocks', 'catalog-counts', catalogCountParams],
    queryFn: () =>
      apiGet<{ blocks: number; apartments: number }>(`/blocks/catalog-counts?${catalogCountParams}`),
    enabled: catalogCountParams != null,
    staleTime: 30_000,
  });

  const { data: kindCounts } = useQuery({
    queryKey: ['stats', 'listing-kind-counts', regionId],
    queryFn: () => apiGet<Record<string, number>>(`/stats/listing-kind-counts?region_id=${regionId}`),
    enabled: regionId != null,
    staleTime: 60_000,
  });

  const visibleObjectTabs = useMemo(() => {
    if (!kindCounts) return objectTabs;
    return objectTabs.filter((t) => (kindCounts[t.kind] ?? 0) > 0);
  }, [kindCounts]);

  const showObjectTypeTabs = visibleObjectTabs.length >= 2;

  useEffect(() => {
    if (!visibleObjectTabs.length) return;
    if (!visibleObjectTabs.some((t) => t.value === activeTab)) {
      setActiveTab(visibleObjectTabs[0].value);
    }
  }, [visibleObjectTabs, activeTab]);

  const belgorodRegion = useMemo(
    () => regionRows?.find((r) => (r.code ?? '').toLowerCase() === 'belgorod'),
    [regionRows],
  );

  const isBelgorodActive = belgorodRegion != null && regionId === belgorodRegion.id;

  const onBelgorodClick = useCallback(() => {
    if (belgorodRegion) {
      setStoredRegionId(isBelgorodActive ? null : belgorodRegion.id);
      return;
    }
    navigate('/belgorod');
  }, [belgorodRegion, isBelgorodActive, navigate, setStoredRegionId]);
  const searchRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const ptRef = useRef<HTMLDivElement>(null);
  const dlRef = useRef<HTMLDivElement>(null);

  const doSearch = () => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (activeTab !== 'apartments') params.set('type', activeTab);
    else params.set('type', 'apartments');
    if (regionId != null) params.set('region_id', String(regionId));

    if (propertyType !== 'Тип квартиры') params.set('rooms', propertyType);
    if (deadline !== 'Срок сдачи') params.set('deadline', deadline);
    if (priceFrom) params.set('priceFrom', priceFrom);
    if (priceTo) params.set('priceTo', priceTo);
    navigate(`/catalog?${params.toString()}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false);
      if (ptRef.current && !ptRef.current.contains(e.target as Node)) setPtOpen(false);
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showHintsPanel =
    activeTab === 'apartments' && searchFocused && q.trim().length >= 2 && regionId != null;

  const currentRegionLabel =
    regionRows?.find((r) => r.id === regionId)?.name ?? 'Регион';

  const ctaLabel = useMemo(() => {
    if (activeTab === 'apartments' && catalogStats) {
      return `${catalogStats.apartments.toLocaleString('ru')} квартир в ${catalogStats.blocks.toLocaleString('ru')} ЖК →`;
    }
    const tab = objectTabs.find((t) => t.value === activeTab);
    const k = tab?.kind;
    const n = k && kindCounts ? kindCounts[k] ?? 0 : 0;
    if (n > 0) {
      const word =
        activeTab === 'houses'
          ? 'домов'
          : activeTab === 'land'
            ? 'участков'
            : activeTab === 'commercial'
              ? 'объектов'
              : 'объектов';
      return `${n.toLocaleString('ru')} ${word} →`;
    }
    return 'Найти →';
  }, [activeTab, catalogStats, kindCounts]);

  return (
    <section className="relative bg-background">
      {/* Mobile: compact padding, Desktop: generous */}
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-5 sm:pt-6 sm:pb-5">

        {/* Geo selector — left-aligned, separate from title */}
        <div className="flex flex-col items-center gap-1 mb-3">
          <div className="relative w-fit" ref={regionRef}>
            <button
              onClick={() => setRegionOpen(!regionOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                regionOpen
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40'
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{currentRegionLabel}</span>
              <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform duration-200', regionOpen && 'rotate-180')} />
            </button>
            {regionOpen && regionRows && regionRows.length > 0 && (
              <ul className="absolute top-full left-0 mt-1.5 py-1.5 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
                {regionRows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStoredRegionId(r.id);
                        setRegionOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2',
                        regionId === r.id && 'text-primary font-medium',
                      )}
                    >
                      {regionId === r.id && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold leading-tight text-center">
            <span className="text-[#2563EB]">Live Grid.</span>{' '}
            <span className="hidden sm:inline text-foreground">62 000+ квартир по России</span>
            <span className="sm:hidden text-foreground">62 000+ квартир</span>
          </h1>
        </div>

        {/* Типы объектов — только режимы фильтрации; показ, если в регионе есть лоты более чем в одном типе */}
        <div className="flex items-center sm:justify-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {showObjectTypeTabs &&
            visibleObjectTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 border shrink-0',
                    activeTab === tab.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background border-border hover:bg-secondary hover:border-primary/30',
                  )}
                >
                  <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  {tab.label}
                </button>
              );
            })}
          {showObjectTypeTabs && <div className="w-px h-6 bg-border shrink-0 mx-0.5 hidden sm:block" />}
          <button
            type="button"
            onClick={onBelgorodClick}
            className={cn(
              'flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 text-white shadow-sm',
              isBelgorodActive ? 'bg-[#EA580C] ring-2 ring-offset-2 ring-[#F97316]' : 'bg-[#F97316] hover:bg-[#EA580C]',
            )}
          >
            🏙 Белгород
          </button>
        </div>

        {/* Search block — на всю ширину контентной колонки; подсказки на ширину карточки */}
        <div
          ref={searchRef}
          className="w-full max-w-[1400px] mx-auto bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] px-5 sm:px-6 py-5 relative"
        >
          <div className="relative z-20">
            {/* Row 1: search + inline filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-0 lg:h-[52px]">
              {/* Search input */}
              <div className="relative flex-1 lg:min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Метро, район, ЖК, улица, застройщик"
                  className="w-full h-[52px] pl-9 pr-3 bg-transparent border-none outline-none text-[15px] placeholder:text-[#94a3b8]"
                  value={q}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doSearch();
                  }}
                />
              </div>

              {/* Desktop inline filters with dividers */}
            <div className="hidden lg:flex items-center">
              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <div ref={ptRef} className="relative">
                <button
                  onClick={() => setPtOpen(!ptOpen)}
                  className={cn(
                    'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                    propertyType !== 'Тип квартиры' ? 'text-primary font-medium' : 'text-foreground'
                  )}
                >
                  {propertyType === 'Тип квартиры' ? 'Тип' : propertyType}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', ptOpen && 'rotate-180')} />
                </button>
                {ptOpen && (
                  <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150">
                    {propertyTypes.map(t => (
                      <li key={t}>
                        <button
                          onClick={() => { setPropertyType(t); setPtOpen(false); }}
                          className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors', propertyType === t && 'text-primary font-medium')}
                        >{t}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <div className="flex items-center h-[52px]">
                <input type="text" placeholder="Цена от" className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none" value={priceFrom} onChange={e => setPriceFrom(e.target.value.replace(/\D/g, ''))} />
                <span className="text-muted-foreground text-sm">—</span>
                <input type="text" placeholder="до, ₽" className="w-[100px] h-full px-3 text-sm bg-transparent outline-none border-none" value={priceTo} onChange={e => setPriceTo(e.target.value.replace(/\D/g, ''))} />
              </div>

              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <div ref={dlRef} className="relative">
                <button
                  onClick={() => setDlOpen(!dlOpen)}
                  className={cn(
                    'h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50',
                    deadline !== 'Срок сдачи' ? 'text-primary font-medium' : 'text-foreground'
                  )}
                >
                  {deadline}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', dlOpen && 'rotate-180')} />
                </button>
                {dlOpen && (
                  <ul className="absolute top-full right-0 mt-1 py-2 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-150">
                    {deadlines.map(d => (
                      <li key={d}>
                        <button
                          onClick={() => { setDeadline(d); setDlOpen(false); }}
                          className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors', deadline === d && 'text-primary font-medium')}
                        >{d}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="w-px h-6 bg-[#e2e8f0] mx-2" />
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="h-[52px] px-3.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors rounded-lg hover:bg-muted/50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Фильтры
              </button>
            </div>
          </div>

            {showHintsPanel && (
              <CatalogSearchHintsDropdown
                hints={catalogHints}
                isLoading={hintsLoading}
                className="absolute left-0 right-0 top-full mt-2"
                onPick={() => {
                  setSearchFocused(false);
                  setQ('');
                }}
              />
            )}
          </div>

          {/* Mobile filters — scrollable pills */}
          <div className="flex lg:hidden gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setPtOpen(!ptOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {propertyType === 'Тип квартиры' ? 'Тип' : propertyType}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] whitespace-nowrap shrink-0">Цена</button>
            <button
              onClick={() => setDlOpen(!dlOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {deadline}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Ещё
            </button>
          </div>

          {/* Advanced filters panel */}
          {filtersOpen && (
            <div className="mt-3 pt-3 border-t border-[#e2e8f0] animate-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Площадь, м²</label>
                  <div className="flex gap-1.5">
                    <input type="text" placeholder="от" className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50" />
                    <input type="text" placeholder="до" className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Этаж</label>
                  <div className="flex gap-1.5">
                    <input type="text" placeholder="от" className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50" />
                    <input type="text" placeholder="до" className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Отделка</label>
                  <select className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50 text-foreground">
                    <option value="">Любая</option>
                    <option value="without">Без отделки</option>
                    <option value="rough">Черновая</option>
                    <option value="clean">Чистовая</option>
                    <option value="turnkey">Под ключ</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Тип жилья</label>
                  <select className="w-full h-9 px-2.5 text-sm rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-primary/50 text-foreground">
                    <option value="">Любой</option>
                    <option value="new">Новостройки</option>
                    <option value="secondary">Вторичка</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: map + CTA */}
          <div className="flex items-center justify-between mt-3.5 gap-2">
            <button
              onClick={() => navigate('/map')}
              className="hidden sm:flex items-center gap-2 py-2.5 px-5 rounded-[10px] border border-[#cbd5e1] bg-white text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary" />
              На карте
            </button>
            <button
              onClick={doSearch}
              className="py-2.5 px-6 flex-1 sm:flex-none rounded-[10px] bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shadow-sm"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
