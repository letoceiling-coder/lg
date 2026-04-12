import CatalogLayout from '@/shared/components/CatalogLayout';
import { HouseCard } from '@/shared/components/PropertyCards';
import { mockHouses, type MockHouse } from '@/shared/data/catalog-mock';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const materials = ['Кирпич', 'Газобетон', 'Каркас', 'Брус', 'СИП-панели'];

function filterHouses(items: MockHouse[], search: string, filters: Record<string, string>) {
  return items.filter(h => {
    if (search) {
      const q = search.toLowerCase();
      if (!h.title.toLowerCase().includes(q) && !h.address.toLowerCase().includes(q) && !h.district.toLowerCase().includes(q)) return false;
    }
    if (filters.priceMin && h.price < Number(filters.priceMin)) return false;
    if (filters.priceMax && h.price > Number(filters.priceMax)) return false;
    if (filters.material) {
      const mats = filters.material.split(',').filter(Boolean);
      if (mats.length && !mats.includes(h.material)) return false;
    }
    return true;
  });
}

const HouseFilters = ({ filters, setFilter }: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => (
  <div className="space-y-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Цена, ₽</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.priceMin || ''} onChange={e => setFilter('priceMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.priceMax || ''} onChange={e => setFilter('priceMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Площадь дома, м²</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.areaMin || ''} onChange={e => setFilter('areaMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.areaMax || ''} onChange={e => setFilter('areaMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Площадь участка, сот.</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.landMin || ''} onChange={e => setFilter('landMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.landMax || ''} onChange={e => setFilter('landMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Материал</p>
      <div className="space-y-1.5">
        {materials.map(m => {
          const active = (filters.material || '').split(',').filter(Boolean);
          return (
            <label key={m} className="flex items-center gap-2 cursor-pointer text-xs">
              <Checkbox
                checked={active.includes(m)}
                onCheckedChange={() => {
                  const next = active.includes(m) ? active.filter(x => x !== m) : [...active, m];
                  setFilter('material', next.join(','));
                }}
                className="w-3.5 h-3.5"
              />
              {m}
            </label>
          );
        })}
      </div>
    </div>
  </div>
);

const CatalogHouses = () => (
  <CatalogLayout<MockHouse>
    title="Дома"
    items={mockHouses}
    filterFn={filterHouses}
    renderCard={(item, variant) => <HouseCard key={item.id} item={item} variant={variant} />}
    renderFilters={(filters, setFilter) => <HouseFilters filters={filters} setFilter={setFilter} />}
  />
);

export default CatalogHouses;
