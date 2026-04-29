import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogFilters, ObjectType, MarketType } from '@/redesign/data/types';

interface Props {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  totalCount: number;
  showMetro?: boolean;
  className?: string;
  districtOptions?: string[];
  subwayOptions?: string[];
  builderOptions?: string[];
  deadlineOptions?: string[];
  objectTypeOptions?: ObjectType[];
  /** Whether the current region/query has residential complexes (blocks).
   *  When false, hide new-build-specific filters (Отделка, Статус, Застройщик, Новостройки/Вторичка). */
  hasBlocks?: boolean;
}

const objectTypes: { value: ObjectType; label: string }[] = [
  { value: 'apartments', label: 'Квартиры' },
  { value: 'houses', label: 'Дома' },
  { value: 'land', label: 'Участки' },
  { value: 'commercial', label: 'Коммерция' },
];

const marketTypes: { value: MarketType; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новостройки' },
  { value: 'secondary', label: 'Вторичка' },
];

const roomOptions = [0, 1, 2, 3, 4];
const roomLabels: Record<number, string> = { 0: 'Ст', 1: '1', 2: '2', 3: '3', 4: '4+' };
const finishingOptions = ['без отделки', 'черновая', 'чистовая', 'под ключ'];

function prettyDistrict(name: string): string {
  const n = name.trim();
  return n
    .replace(/^ГО\s+/i, '')
    .replace(/^(г\.?\s*)/i, '')
    .replace(/,\s*МО\s*$/i, '')
    .trim();
}

const statusOptions = [
  { value: 'building', label: 'Строится' },
  { value: 'completed', label: 'Сдан' },
  { value: 'planned', label: 'Планируется' },
];

/* --- Collapsible section --- */
const FilterSection = ({
  title,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button className="flex items-center justify-between w-full py-2.5 group" onClick={() => setOpen(!open)}>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold align-middle">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[500px] opacity-100 pb-3' : 'max-h-0 opacity-0',
        )}
      >
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
};

/* --- Searchable checkbox list --- */
const SearchableCheckboxList = ({
  items,
  selected,
  onToggle,
  placeholder,
  renderLabel,
  searchKey,
}: {
  items: string[];
  selected: string[];
  onToggle: (val: string) => void;
  placeholder: string;
  renderLabel?: (val: string) => React.ReactNode;
  searchKey?: (val: string) => string;
}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => (searchKey ? searchKey(i) : i).toLowerCase().includes(q));
  }, [items, search, searchKey]);

  return (
    <div className="space-y-2">
      {items.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-8 h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {selected.filter(s => filtered.includes(s)).map(item => (
          <label key={item} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            <Checkbox checked onCheckedChange={() => onToggle(item)} className="w-3.5 h-3.5" />
            {renderLabel ? renderLabel(item) : item}
          </label>
        ))}
        {filtered.filter(i => !selected.includes(i)).map(item => (
          <label key={item} className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Checkbox checked={false} onCheckedChange={() => onToggle(item)} className="w-3.5 h-3.5" />
            {renderLabel ? renderLabel(item) : item}
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-1">Ничего не найдено</p>
        )}
      </div>
    </div>
  );
};

/* --- Main component --- */
const FilterSidebar = ({
  filters,
  onChange,
  totalCount,
  showMetro = true,
  className,
  districtOptions,
  subwayOptions,
  builderOptions,
  deadlineOptions,
  objectTypeOptions,
  hasBlocks = false,
}: Props) => {
  // All filter options come exclusively from the API — no mock fallbacks
  const districts = districtOptions ?? [];

  // Metro: shown only when API returns at least one station
  const hasMetro = (subwayOptions?.length ?? 0) > 0;
  const subways = subwayOptions ?? [];

  // Builders: shown only for new buildings and only when API returns at least one builder
  const hasBuilders = (builderOptions?.length ?? 0) > 0;
  const builders = builderOptions ?? [];

  const visibleObjectTypes = objectTypeOptions?.length
    ? objectTypes.filter(o => objectTypeOptions.includes(o.value))
    : objectTypes;

  // Derived flags for conditional filter rendering
  const isApartments = filters.objectType === 'apartments';
  const isLand = filters.objectType === 'land';
  // "New building" mode: apartments not in secondary market or "all" without explicit secondary
  // isNewBuilding: show new-build filters only when region has actual blocks
  const isNewBuilding = isApartments && hasBlocks && filters.marketType !== 'secondary';

  const update = useCallback(<K extends keyof CatalogFilters>(key: K, val: CatalogFilters[K]) => {
    onChange({ ...filters, [key]: val });
  }, [filters, onChange]);

  const toggleArray = useCallback((key: 'rooms' | 'district' | 'subway' | 'builder' | 'finishing' | 'deadline' | 'status', val: string | number) => {
    const arr = filters[key] as (string | number)[];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next });
  }, [filters, onChange]);

  const hasFilters = useMemo(() => {
    return filters.rooms.length > 0 || filters.district.length > 0 || filters.subway.length > 0 ||
      filters.builder.length > 0 || filters.finishing.length > 0 || filters.deadline.length > 0 ||
      filters.status.length > 0 || filters.search !== '' ||
      filters.priceMin !== undefined || filters.priceMax !== undefined ||
      filters.areaMin !== undefined || filters.areaMax !== undefined ||
      filters.floorMin !== undefined || filters.floorMax !== undefined;
  }, [filters]);

  const activeTags = useMemo(() => {
    const tags: { label: string; clear: () => void }[] = [];
    filters.rooms.forEach(r => tags.push({ label: roomLabels[r] || `${r}к`, clear: () => toggleArray('rooms', r) }));
    filters.district.forEach(d => tags.push({ label: prettyDistrict(d), clear: () => toggleArray('district', d) }));
    filters.subway.forEach(s => tags.push({ label: `м. ${s}`, clear: () => toggleArray('subway', s) }));
    filters.builder.forEach(b => tags.push({ label: b, clear: () => toggleArray('builder', b) }));
    filters.finishing.forEach(f => tags.push({ label: f, clear: () => toggleArray('finishing', f) }));
    filters.status.forEach(s => {
      const opt = statusOptions.find(o => o.value === s);
      tags.push({ label: opt?.label || s, clear: () => toggleArray('status', s) });
    });
    if (filters.priceMin) tags.push({ label: `от ${(filters.priceMin / 1e6).toFixed(1)} млн`, clear: () => update('priceMin', undefined) });
    if (filters.priceMax) tags.push({ label: `до ${(filters.priceMax / 1e6).toFixed(1)} млн`, clear: () => update('priceMax', undefined) });
    if (filters.areaMin) tags.push({ label: `от ${filters.areaMin} ${isLand ? 'сот.' : 'м²'}`, clear: () => update('areaMin', undefined) });
    if (filters.areaMax) tags.push({ label: `до ${filters.areaMax} ${isLand ? 'сот.' : 'м²'}`, clear: () => update('areaMax', undefined) });
    if (filters.floorMin) tags.push({ label: `этаж от ${filters.floorMin}`, clear: () => update('floorMin', undefined) });
    if (filters.floorMax) tags.push({ label: `этаж до ${filters.floorMax}`, clear: () => update('floorMax', undefined) });
    return tags;
  }, [filters, toggleArray, update, isLand]);

  const resetAll = useCallback(() => {
    onChange({
      objectType: filters.objectType, marketType: 'all',
      rooms: [], district: [], subway: [], builder: [],
      finishing: [], deadline: [], status: [], search: '',
      priceMin: undefined, priceMax: undefined,
      areaMin: undefined, areaMax: undefined,
      floorMin: undefined, floorMax: undefined,
    });
  }, [onChange, filters.objectType]);

  return (
    <div className={cn('space-y-0', className)}>
      {/* Active tags */}
      {activeTags.length > 0 && (
        <div className="pb-3 mb-1 border-b border-border">
          <div className="flex flex-wrap gap-1 min-w-0">
          {activeTags.map((tag, i) => (
            <button
              key={i}
              onClick={tag.clear}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors max-w-full min-w-0"
              title={tag.label}
            >
              <span className="truncate">{tag.label}</span>
              <X className="w-2.5 h-2.5" />
            </button>
          ))}
          </div>
          <button
            onClick={resetAll}
            className="mt-2 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Очистить все
          </button>
        </div>
      )}

      {/* 1. Тип объекта */}
      <FilterSection title="Тип объекта" count={0}>
        <div className="flex flex-wrap gap-1">
          {visibleObjectTypes.map(t => (
            <button
              key={t.value}
              onClick={() => {
                if (t.value === filters.objectType) return;
                // Reset all type-specific filters when switching object type
                onChange({
                  objectType: t.value,
                  marketType: 'all',
                  search: filters.search,
                  priceMin: filters.priceMin,
                  priceMax: filters.priceMax,
                  // Reset: rooms, area (different units), floor, deadline, finishing, status, subway, builder, district
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
                'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                filters.objectType === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-background hover:border-primary/50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Sub-filter: Новостройки / Вторичка — only if region has new builds */}
        {isApartments && hasBlocks && (
          <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
            {marketTypes.map(t => (
              <button
                key={t.value}
                onClick={() => update('marketType', t.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
                  filters.marketType === t.value
                    ? 'bg-accent text-accent-foreground border-primary/30'
                    : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Тип жилья removed — no backing data model */}

      {/* 3. Цена */}
      <FilterSection title="Цена, ₽" count={filters.priceMin || filters.priceMax ? 1 : 0}>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="от"
            className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary"
            value={filters.priceMin ?? ''}
            onChange={e => update('priceMin', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="до"
            className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary"
            value={filters.priceMax ?? ''}
            onChange={e => update('priceMax', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </FilterSection>

      {/* 4. Комнатность — only for apartments */}
      {isApartments && (
        <FilterSection title="Комнатность" count={filters.rooms.length}>
          <div className="flex gap-1">
            {roomOptions.map(r => (
              <button
                key={r}
                onClick={() => toggleArray('rooms', r)}
                className={cn(
                  'h-8 flex-1 rounded-lg text-xs font-medium border transition-colors',
                  filters.rooms.includes(r)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-foreground hover:border-primary/50'
                )}
              >
                {roomLabels[r]}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* 5. Площадь — label adapts: м² for apartments/houses/commercial, сот. for land */}
      <FilterSection
        title={isLand ? 'Площадь участка, сот.' : 'Площадь, м²'}
        defaultOpen={false}
        count={filters.areaMin || filters.areaMax ? 1 : 0}
      >
        <div className="flex gap-2">
          <Input type="number" placeholder="от" className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary" value={filters.areaMin ?? ''} onChange={e => update('areaMin', e.target.value ? Number(e.target.value) : undefined)} />
          <Input type="number" placeholder="до" className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary" value={filters.areaMax ?? ''} onChange={e => update('areaMax', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      </FilterSection>

      {/* 6. Этаж — only for apartments (API floor filter applies only to apartment.floor) */}
      {isApartments && (
        <FilterSection title="Этаж" defaultOpen={false} count={filters.floorMin || filters.floorMax ? 1 : 0}>
          <div className="flex gap-2">
            <Input type="number" placeholder="от" className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary" value={filters.floorMin ?? ''} onChange={e => update('floorMin', e.target.value ? Number(e.target.value) : undefined)} />
            <Input type="number" placeholder="до" className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:border-primary" value={filters.floorMax ?? ''} onChange={e => update('floorMax', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </FilterSection>
      )}

      {/* 7. Срок сдачи — only for new apartments with deadline options available */}
      {isNewBuilding && (deadlineOptions?.length ?? 0) > 0 && (
        <FilterSection title="Срок сдачи" defaultOpen={false} count={filters.deadline.length}>
          <div className="flex flex-wrap gap-1">
            {(deadlineOptions ?? []).map(d => (
              <button
                key={String(d).replace(/Q/gi, 'к')}
                onClick={() => toggleArray('deadline', d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                  filters.deadline.includes(d)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50'
                )}
              >
                {String(d).replace(/Q/gi, 'к')}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* 8. Отделка — only for new apartments */}
      {isNewBuilding && (
        <FilterSection title="Отделка" defaultOpen={false} count={filters.finishing.length}>
          <div className="space-y-1.5">
            {finishingOptions.map(f => (
              <label key={f} className="flex items-center gap-2 cursor-pointer text-xs capitalize hover:text-foreground transition-colors">
                <Checkbox checked={filters.finishing.includes(f)} onCheckedChange={() => toggleArray('finishing', f)} className="w-3.5 h-3.5" />
                {f}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* 9. Статус — only for new apartments */}
      {isNewBuilding && (
        <FilterSection title="Статус" defaultOpen={false} count={filters.status.length}>
          <div className="space-y-1.5">
            {statusOptions.map(s => (
              <label key={s.value} className="flex items-center gap-2 cursor-pointer text-xs hover:text-foreground transition-colors">
                <Checkbox checked={filters.status.includes(s.value)} onCheckedChange={() => toggleArray('status', s.value)} className="w-3.5 h-3.5" />
                {s.label}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* 10. Район — show only if there are districts */}
      {districts.length > 0 && (
        <FilterSection title="Район" defaultOpen={false} count={filters.district.length}>
          <SearchableCheckboxList
            items={districts}
            selected={filters.district}
            onToggle={val => toggleArray('district', val)}
            placeholder="Найти район..."
            renderLabel={prettyDistrict}
            searchKey={prettyDistrict}
          />
        </FilterSection>
      )}

      {/* 11. Метро — hidden if region has no subway stations (API returned empty array) */}
      {hasMetro && (
        <FilterSection title="Метро" defaultOpen={false} count={filters.subway.length}>
          <SearchableCheckboxList
            items={subways}
            selected={filters.subway}
            onToggle={val => toggleArray('subway', val)}
            placeholder="Найти станцию..."
          />
        </FilterSection>
      )}

      {/* 12. Застройщик — only for new buildings, and only if region has builders */}
      {isNewBuilding && hasBuilders && (
        <FilterSection title="Застройщик" defaultOpen={false} count={filters.builder.length}>
          <SearchableCheckboxList
            items={builders}
            selected={filters.builder}
            onToggle={val => toggleArray('builder', val)}
            placeholder="Найти застройщика..."
          />
        </FilterSection>
      )}

      {/* Actions */}
      <div className="pt-3 space-y-2">
        <Link
          to="/map"
          className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-border bg-background text-xs font-medium hover:bg-secondary transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Показать на карте
        </Link>
        {hasFilters && (
          <button
            onClick={resetAll}
            className="flex items-center justify-center gap-1.5 w-full h-8 rounded-xl text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" /> Сбросить все фильтры
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterSidebar;
