import CatalogLayout from '@/shared/components/CatalogLayout';
import { CommercialCard } from '@/shared/components/PropertyCards';
import { mockCommercial, type MockCommercial } from '@/shared/data/catalog-mock';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const commercialTypes = ['Офис', 'Склад', 'Торговое', 'Свободного назначения'];

function filterCommercial(items: MockCommercial[], search: string, filters: Record<string, string>) {
  return items.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.address.toLowerCase().includes(q) && !c.district.toLowerCase().includes(q)) return false;
    }
    if (filters.priceMin && c.price < Number(filters.priceMin)) return false;
    if (filters.priceMax && c.price > Number(filters.priceMax)) return false;
    if (filters.type) {
      const types = filters.type.split(',').filter(Boolean);
      if (types.length && !types.includes(c.type)) return false;
    }
    return true;
  });
}

const CommercialFilters = ({ filters, setFilter }: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => (
  <div className="space-y-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Цена, ₽</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.priceMin || ''} onChange={e => setFilter('priceMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.priceMax || ''} onChange={e => setFilter('priceMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Площадь, м²</p>
      <div className="flex gap-2">
        <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.areaMin || ''} onChange={e => setFilter('areaMin', e.target.value)} />
        <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.areaMax || ''} onChange={e => setFilter('areaMax', e.target.value)} />
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Тип</p>
      <div className="space-y-1.5">
        {commercialTypes.map(t => {
          const active = (filters.type || '').split(',').filter(Boolean);
          return (
            <label key={t} className="flex items-center gap-2 cursor-pointer text-xs">
              <Checkbox
                checked={active.includes(t)}
                onCheckedChange={() => {
                  const next = active.includes(t) ? active.filter(x => x !== t) : [...active, t];
                  setFilter('type', next.join(','));
                }}
                className="w-3.5 h-3.5"
              />
              {t}
            </label>
          );
        })}
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Район</p>
      <Input placeholder="Район..." className="h-8 text-xs" value={filters.district || ''} onChange={e => setFilter('district', e.target.value)} />
    </div>
  </div>
);

const CatalogCommercial = () => (
  <CatalogLayout<MockCommercial>
    title="Коммерческая недвижимость"
    items={mockCommercial}
    filterFn={filterCommercial}
    renderCard={(item, variant) => <CommercialCard key={item.id} item={item} variant={variant} />}
    renderFilters={(filters, setFilter) => <CommercialFilters filters={filters} setFilter={setFilter} />}
  />
);

export default CatalogCommercial;
