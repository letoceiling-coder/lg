import { Heart, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropertyBadge from './PropertyBadge';
import CardShell from './CardShell';
import PriceLabel from './PriceLabel';

export interface PropertyData {
  image: string;
  title: string;
  price: string;
  address: string;
  area?: string;
  rooms?: string;
  badges?: string[];
  slug?: string;
  description?: string;
  metro?: string;
  district?: string;
  buildingClass?: string;
  deadline?: string;
  mortgage?: string;
  coords?: [number, number];
  developer?: string;
  listingCount?: number;
  metroNotes?: { name: string; time?: number | null; by?: 'walk' | 'transport' }[];
}

const PropertyCard = ({ data, variant = 'default' }: { data: PropertyData; basePath?: string; variant?: 'default' | 'hot' }) => {
  const [liked, setLiked] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
  const linkPath = `/complex/${slug}`;
  const isHot = variant === 'hot';
  const hasBuilder = Boolean(data.developer && data.developer !== '—');
  const hasDeadline = Boolean(data.deadline && data.deadline !== '—');
  const hasImage = Boolean(data.image?.trim());

  return (
    <CardShell highlighted={isHot} className="h-auto">
      <Link to={linkPath} className="flex flex-col">
        {hasImage ? (
          <div className="relative shrink-0 overflow-hidden h-[160px]">
            <img
              src={data.image}
              alt={data.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            {isHot && (
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/15 via-transparent to-transparent" />
            )}
            {data.badges && data.badges.length > 0 && (
              <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                {data.badges.map((b, i) => (
                  <PropertyBadge key={i} label={b} type={isHot ? undefined : 'info'} />
                ))}
              </div>
            )}
            <button
              className="absolute top-2 right-2 w-7 h-7 bg-background/70 backdrop-blur-sm rounded-full flex items-center justify-center z-10 hover:bg-background/90 transition-colors"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
            >
              <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
            </button>
          </div>
        ) : null}

        <div className="p-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-[16px] leading-tight truncate">{data.title}</h3>
            <PriceLabel value={data.price} hot={isHot} />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{data.address}</span>
          </div>
          {data.metroNotes && data.metroNotes.length > 0 ? (
            <div className="space-y-0.5">
              {data.metroNotes.slice(0, 2).map((m, idx) => (
                <p key={`${m.name}-${idx}`} className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', idx === 0 ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <span className="truncate">
                    {m.name}
                    {m.time != null ? `, ${m.time} минут ${m.by === 'walk' ? 'пешком' : 'транспортом'}` : ''}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
          {hasBuilder ? (
            <p className="text-[11px] text-muted-foreground truncate">Застройщик: {data.developer}</p>
          ) : null}
          {(data.area || data.rooms) && (
            <p className="text-[11px] text-muted-foreground">{[data.area, data.rooms].filter(Boolean).join(' · ')}</p>
          )}
          <div className="pt-2 mt-2 border-t border-border/70 space-y-1">
            {hasDeadline ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Сдача</span>
                <span className="font-medium">{data.deadline}</span>
              </div>
            ) : null}
            {data.listingCount ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Квартир</span>
                <span className="font-medium">{data.listingCount}</span>
              </div>
            ) : null}
            <span className="text-primary text-[11px] font-medium hover:underline">Подробнее</span>
          </div>
        </div>
      </Link>
    </CardShell>
  );
};

export default PropertyCard;
