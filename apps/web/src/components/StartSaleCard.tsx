import { Heart, MapPin } from 'lucide-react';
import PropertyBadge from './PropertyBadge';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface StartSaleData {
  image: string;
  title: string;
  price: string;
  address: string;
  badges?: string[];
  description?: string;
  slug?: string;
  developer?: string;
  district?: string;
  /** Явно задано API: пустой массив — без моковой разбивки по комнатам */
  apartments?: { type: string; price: string; count: number }[];
  /** Число активных объявлений (из каталога) */
  listingCount?: number;
  /** Подпись даты старта продаж */
  salesStartLabel?: string;
}

const defaultApartments = [
  { type: 'Студия', price: 'от 3.2 млн', count: 12 },
  { type: '1-комн.', price: 'от 4.8 млн', count: 24 },
  { type: '2-комн.', price: 'от 7.1 млн', count: 18 },
  { type: '3-комн.', price: 'от 10.5 млн', count: 8 },
];

const StartSaleCard = ({ data }: { data: StartSaleData }) => {
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
  const linkPath = `/complex/${slug}`;
  const useMockApartments = data.apartments === undefined;
  const apartments = useMockApartments ? defaultApartments : data.apartments;
  const totalUnits =
    data.listingCount != null && data.listingCount > 0
      ? data.listingCount
      : apartments.reduce((s, a) => s + a.count, 0);
  /** Моки без поля apartments — прежний оверлей; API с `apartments: []` — текстовый fallback */
  const hasRoomBreakdown = useMockApartments || apartments.length > 0;

  const handleTap = useCallback((e: React.MouseEvent) => {
    if ('ontouchstart' in window && !hovered) {
      e.preventDefault();
      setHovered(true);
    }
  }, [hovered]);

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card border border-border transition-shadow duration-200 hover:shadow-md h-[300px] flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={linkPath} className="flex flex-col flex-1 min-h-0" onClick={handleTap}>
        {/* Image — fixed height, no shrinking */}
        <div className="relative shrink-0 overflow-hidden h-[160px]">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />

          {data.badges && data.badges.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
              {data.badges.map((b, i) => (
                <PropertyBadge key={i} label={b} type="start" />
              ))}
            </div>
          )}

          <button
            className="absolute top-2 right-2 w-7 h-7 bg-background/70 backdrop-blur-sm rounded-full flex items-center justify-center z-10 hover:bg-background/90 transition-colors active:scale-90"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
          >
            <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        </div>

        {/* Info block — fills remaining space */}
        <div className="p-3 flex-1 flex flex-col gap-0.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{data.title}</h3>
            <span className="font-bold text-sm shrink-0">{data.price}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{data.district || data.address}{data.developer ? ` · ${data.developer}` : ''}</span>
          </div>
          {data.salesStartLabel ? (
            <p className="text-[11px] text-muted-foreground">{data.salesStartLabel}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">{totalUnits} квартир в продаже</p>
          <span className="text-primary text-[11px] font-medium mt-auto hover:underline">Подробнее</span>
        </div>
      </Link>

      {/* Hover overlay — absolute, no layout shift */}
      <div
        className={cn(
          'absolute inset-0 z-20 rounded-xl bg-card/95 backdrop-blur-sm flex flex-col transition-all duration-250 ease-in-out pointer-events-none',
          hovered ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2'
        )}
      >
        {/* Overlay header */}
        <div className="p-3 border-b border-border">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{data.title}</h3>
            <span className="font-bold text-sm shrink-0 text-primary">{data.price}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{data.district || data.address}{data.developer ? ` · ${data.developer}` : ''}</span>
          </div>
        </div>

        {/* Apartment list or fallback */}
        <div className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {hasRoomBreakdown ? (
            <>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Квартиры в продаже</p>
              {apartments.map((apt, i) => (
                <Link
                  key={i}
                  to={`${linkPath}?rooms=${encodeURIComponent(apt.type)}`}
                  className="flex items-center justify-between py-1.5 px-2 -mx-1 rounded-lg hover:bg-secondary transition-colors text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-foreground font-medium">{apt.type}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground">{apt.count} шт.</span>
                    <span className="font-semibold text-primary">{apt.price}</span>
                  </div>
                </Link>
              ))}
            </>
          ) : (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {data.salesStartLabel ? <p className="mb-2">{data.salesStartLabel}</p> : null}
              <p>Разбивка по комнатности появится после загрузки прайса. Откройте карточку ЖК для планировок и фильтров.</p>
            </div>
          )}
        </div>

        {/* Overlay footer */}
        <div className="p-3 border-t border-border">
          <Link
            to={linkPath}
            className="block w-full text-center py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Подробнее о ЖК
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StartSaleCard;
