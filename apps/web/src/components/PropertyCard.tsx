import { Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PropertyBadge from './PropertyBadge';

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
}

const PropertyCard = ({ data, variant = 'default' }: { data: PropertyData; basePath?: string; variant?: 'default' | 'hot' }) => {
  const [liked, setLiked] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
  const linkPath = `/complex/${slug}`;
  const isHot = variant === 'hot';

  return (
    <Link
      to={linkPath}
      className={cn(
        'group flex flex-col rounded-xl overflow-hidden bg-card border transition-all duration-200 hover:shadow-md hover:-translate-y-px',
        isHot ? 'border-primary/20 hover:border-primary/40' : 'border-border'
      )}
    >
      {/* Image */}
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

      {/* Info */}
      <div className="p-3 flex flex-col gap-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm leading-tight truncate">{data.title}</h3>
          <span className={cn('font-bold text-sm shrink-0', isHot ? 'text-[#EF4444]' : 'text-primary')}>{data.price}</span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{data.address}</p>
        {(data.area || data.rooms) && (
          <p className="text-[11px] text-muted-foreground">{[data.area, data.rooms].filter(Boolean).join(' · ')}</p>
        )}
        <span className="text-primary text-[11px] font-medium mt-1 hover:underline">Подробнее</span>
      </div>
    </Link>
  );
};

export default PropertyCard;
