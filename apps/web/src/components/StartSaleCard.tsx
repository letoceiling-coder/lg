import { Heart, MapPin } from 'lucide-react';
import PropertyBadge from './PropertyBadge';
import CardShell from './CardShell';
import { useState } from 'react';
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
  metroNotes?: { name: string; time?: number | null; by?: 'walk' | 'transport' }[];
}

const defaultApartments = [
  { type: 'Студия', price: 'от 3.2 млн', count: 12 },
  { type: '1-комн.', price: 'от 4.8 млн', count: 24 },
  { type: '2-комн.', price: 'от 7.1 млн', count: 18 },
  { type: '3-комн.', price: 'от 10.5 млн', count: 8 },
];

const StartSaleCard = ({ data }: { data: StartSaleData }) => {
  const [liked, setLiked] = useState(false);
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
  const metroNotes = data.metroNotes?.slice(0, 3) ?? [];

  return (
    <CardShell className="h-[430px]">
      <Link to={linkPath} className="flex flex-col flex-1 min-h-0">
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
          {data.salesStartLabel ? (
            <div className="absolute left-2 bottom-2 rounded bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground">
              {data.salesStartLabel.replace('Старт продаж: ', '')}
            </div>
          ) : null}
        </div>

        {/* Info block — fills remaining space */}
        <div className="p-3 flex-1 flex flex-col gap-2">
          <h3 className="font-semibold text-[17px] leading-tight truncate">{data.title}</h3>

          <div className="space-y-1.5 min-h-[52px]">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{data.address}</span>
            </div>
          {metroNotes.length > 0 ? (
            <div className="space-y-0.5">
              {metroNotes.map((m, idx) => (
                <p key={`${m.name}-${idx}`} className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-amber-500' : 'bg-violet-500')} />
                  <span className="truncate">
                    {m.name}
                    {m.time != null ? `, ${m.time} минут ${m.by === 'walk' ? 'пешком' : 'транспортом'}` : ''}
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Метро уточняется</p>
          )}
          </div>

          {data.developer && data.developer !== '—' ? (
            <p className="text-[11px] text-muted-foreground truncate">Застройщик: {data.developer}</p>
          ) : null}

          <div className="pt-2 mt-auto border-t border-border/70 space-y-1.5">
            {hasRoomBreakdown ? (
              <div className="space-y-1.5">
                {apartments.slice(0, 4).map((apt, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] border-b border-border/60 pb-1 last:border-0 last:pb-0">
                    <span className="text-muted-foreground truncate pr-2">{apt.type}</span>
                    <span className="font-medium whitespace-nowrap">{apt.price}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-foreground">Квартир</span>
              <span className="font-medium">{totalUnits}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Цена</span>
              <span className="font-semibold text-primary">{data.price}</span>
            </div>
            <span className="block text-primary text-[11px] font-medium hover:underline">Подробнее</span>
          </div>
        </div>
      </Link>
    </CardShell>
  );
};

export default StartSaleCard;
