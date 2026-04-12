import { Heart, MapPin, Building2, Ruler, CalendarDays, Banknote } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { PropertyData } from '@/components/PropertyCard';

interface Props {
  items: PropertyData[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
}

const CatalogList = ({ items, activeSlug, onSelect }: Props) => (
  <div className="space-y-4">
    {items.map((data, i) => (
      <ListCard key={i} data={data} isActive={activeSlug === (data.slug || '')} onSelect={onSelect} />
    ))}
  </div>
);

const ListCard = ({ data, isActive, onSelect }: { data: PropertyData; isActive: boolean; onSelect?: (s: string) => void }) => {
  const [liked, setLiked] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');

  return (
    <div
      className={cn(
        'group flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-card border transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-0.5',
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      )}
      onClick={() => onSelect?.(slug)}
    >
      {/* Image */}
      <Link to={`/object/${slug}`} className="block sm:w-[320px] lg:w-[360px] shrink-0 relative overflow-hidden">
        <div className="h-[220px] sm:h-full min-h-[220px]">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
          />
        </div>
        {data.badges && data.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {data.badges.map((b, i) => (
              <span key={i} className="px-3 py-1.5 bg-background/85 backdrop-blur-sm rounded-full text-xs font-medium">{b}</span>
            ))}
          </div>
        )}
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
        >
          <Heart className={cn('w-4 h-4', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
        </button>
      </Link>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
        <div>
          <Link to={`/object/${slug}`} className="block">
            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">{data.title}</h3>
          </Link>

          {data.district && (
            <p className="text-xs text-muted-foreground mt-1">{data.district}</p>
          )}

          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {data.metro && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{data.metro}</span>
              </div>
            )}
            {data.buildingClass && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Класс: {data.buildingClass}</span>
              </div>
            )}
            {data.area && (
              <div className="flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span>{data.area}</span>
              </div>
            )}
            {data.deadline && (
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Сдача: {data.deadline}</span>
              </div>
            )}
            {data.mortgage && (
              <div className="flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 shrink-0" />
                <span>{data.mortgage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between mt-4 gap-3">
          <span className="text-lg font-bold">{data.price}</span>
          <Link
            to={`/object/${slug}`}
            className="text-primary text-xs font-medium hover:underline shrink-0"
          >
            Подробнее →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CatalogList;
