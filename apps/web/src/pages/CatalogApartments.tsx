import CatalogLayout from '@/shared/components/CatalogLayout';
import { ApartmentCard } from '@/shared/components/PropertyCards';
import { mockApartments, type MockApartment } from '@/shared/data/catalog-mock';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const roomOptions = [
  { value: 'studio', label: 'Ст' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4+' },
];
const finishings = ['без отделки', 'черновая', 'чистовая', 'под ключ'];

function filterApartments(items: MockApartment[], search: string, filters: Record<string, string>) {
  return items.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.complexName.toLowerCase().includes(q) && !a.address.toLowerCase().includes(q) && !a.district.toLowerCase().includes(q) && !a.subway.toLowerCase().includes(q)) return false;
    }
    if (filters.rooms) {
      const rooms = filters.rooms.split(',');
      const r = String(a.rooms);
      if (!rooms.includes(r) && !(rooms.includes('4') && typeof a.rooms === 'number' && a.rooms >= 4)) return false;
    }
    if (filters.priceMin && a.price < Number(filters.priceMin)) return false;
    if (filters.priceMax && a.price > Number(filters.priceMax)) return false;
    if (filters.finishing && !filters.finishing.split(',').includes(a.finishing)) return false;
    return true;
  });
}

const ApartmentFilters = ({ filters, setFilter }: { filters: Record<string, string>; setFilter: (k: string, v: string) => void }) => {
  const activeRooms = (filters.rooms || '').split(',').filter(Boolean);

  const toggleRoom = (val: string) => {
    const next = activeRooms.includes(val) ? activeRooms.filter(r => r !== val) : [...activeRooms, val];
    setFilter('rooms', next.join(','));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Комнатность</p>
        <div className="flex gap-1">
          {roomOptions.map(r => (
            <button
              key={r.value}
              onClick={() => toggleRoom(r.value)}
              className={cn(
                'h-8 flex-1 rounded-lg text-xs font-medium border transition-colors',
                activeRooms.includes(r.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Цена, ₽</p>
        <div className="flex gap-2">
          <Input type="number" placeholder="от" className="h-8 text-xs" value={filters.priceMin || ''} onChange={e => setFilter('priceMin', e.target.value)} />
          <Input type="number" placeholder="до" className="h-8 text-xs" value={filters.priceMax || ''} onChange={e => setFilter('priceMax', e.target.value)} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Отделка</p>
        <div className="space-y-1.5">
          {finishings.map(f => {
            const active = (filters.finishing || '').split(',').filter(Boolean);
            return (
              <label key={f} className="flex items-center gap-2 cursor-pointer text-xs capitalize">
                <Checkbox
                  checked={active.includes(f)}
                  onCheckedChange={() => {
                    const next = active.includes(f) ? active.filter(x => x !== f) : [...active, f];
                    setFilter('finishing', next.join(','));
                  }}
                  className="w-3.5 h-3.5"
                />
                {f}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CatalogApartments = () => (
  <CatalogLayout<MockApartment>
    title="Квартиры"
    items={mockApartments}
    filterFn={filterApartments}
    renderCard={(item, variant) => <ApartmentCard key={item.id} item={item} variant={variant} />}
    renderFilters={(filters, setFilter) => <ApartmentFilters filters={filters} setFilter={setFilter} />}
  />
);

export default CatalogApartments;
