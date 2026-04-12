import CatalogLayout from '@/shared/components/CatalogLayout';
import { LandCard } from '@/shared/components/PropertyCards';
import { mockLand, type MockLand } from '@/shared/data/catalog-mock';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const purposes = ['ИЖС', 'СНТ', 'Коммерция', 'ЛПХ'];

function filterLand(items: MockLand[], search: string, filters: Record<string, string>) {
  return items.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.title.toLowerCase().includes(q) && !l.address.toLowerCase().includes(q) && !l.district.toLowerCase().includes(q)) return false;
    }
    if (filters.priceMin && l.price < Number(filters.priceMin)) return false;
    if (filters.priceMax && l.price > Number(filters.priceMax)) return false;
    if (filters.purpose) {
      const ps = filters.purpose.split(',').filter(Boolean);
      if (ps.length && !ps.includes(l.purpose)) return false;
    }
    return true;
  });
}

const LandFilters = ({ filters, setFilter }: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => (
  <div className="space-y-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Цена, ₽</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.priceMin || ''} onChange={e => setFilter('priceMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.priceMax || ''} onChange={e => setFilter('priceMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Площадь, сот.</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.areaMin || ''} onChange={e => setFilter('areaMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.areaMax || ''} onChange={e => setFilter('areaMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Назначение</p>
      <div className="space-y-1.5">
        {purposes.map(p => {
          const active = (filters.purpose || '').split(',').filter(Boolean);
          return (
            <label key={p} className="flex items-center gap-2 cursor-pointer text-xs">
              <Checkbox
                checked={active.includes(p)}
                onCheckedChange={() => {
                  const next = active.includes(p) ? active.filter(x => x !== p) : [...active, p];
                  setFilter('purpose', next.join(','));
                }}
                className="w-3.5 h-3.5"
              />
              {p}
            </label>
          );
        })}
      </div>
    </div>
  </div>
);

const CatalogLand = () => (
  <CatalogLayout<MockLand>
    title="Земельные участки"
    items={mockLand}
    filterFn={filterLand}
    renderCard={(item, variant) => <LandCard key={item.id} item={item} variant={variant} />}
    renderFilters={(filters, setFilter) => <LandFilters filters={filters} setFilter={setFilter} />}
  />
);

export default CatalogLand;
