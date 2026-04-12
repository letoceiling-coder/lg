import { useState, useRef, useCallback } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import PropertyBadge from './PropertyBadge';
import { useNavigate } from 'react-router-dom';

export interface ZhkApartment { type: string; area: string; price: string; }
export interface ZhkData {
  images: string[];
  name: string;
  price: string;
  unitsCount: string;
  badges: string[];
  apartments: ZhkApartment[];
  slug?: string;
  district?: string;
}

const ZhkCard = ({ data }: { data: ZhkData }) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const touchRef = useRef(0);
  const navigate = useNavigate();
  const slug = data.slug || 'smorodina';

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(data.images.length - 1, Math.max(0, Math.floor((x / rect.width) * data.images.length)));
    setPhotoIdx(prev => prev !== idx ? idx : prev);
  }, [data.images.length]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    navigate(`/zhk/${slug}`);
  };

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-card border border-border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-px"
      onClick={handleCardClick}
    >
      {/* Photo — compact */}
      <div
        className="relative overflow-hidden h-[180px]"
        onMouseMove={handleMouseMove}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          e.stopPropagation();
          const diff = e.changedTouches[0].clientX - touchRef.current;
          if (Math.abs(diff) > 50) {
            if (diff > 0) setPhotoIdx(p => Math.max(0, p - 1));
            else setPhotoIdx(p => Math.min(data.images.length - 1, p + 1));
          }
        }}
      >
        <img
          src={data.images[photoIdx]}
          alt={data.name}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />

        {/* Badge */}
        {data.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
            {data.badges.slice(0, 2).map((b, i) => (
              <PropertyBadge key={i} label={b} type="info" />
            ))}
          </div>
        )}

        {/* Heart */}
        <button
          data-no-nav
          className="absolute top-2 right-2 w-7 h-7 bg-background/70 backdrop-blur-sm rounded-full flex items-center justify-center z-10 hover:bg-background/90 transition-colors"
          onClick={e => { e.stopPropagation(); setLiked(!liked); }}
        >
          <Heart className={cn("w-3.5 h-3.5", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>

        {/* Dots */}
        {data.images.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {data.images.map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-150", i === photoIdx ? "bg-background" : "bg-background/40")} />
            ))}
          </div>
        )}
      </div>

      {/* Info — tight */}
      <div className="p-3 flex flex-col gap-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm leading-tight truncate">{data.name}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{data.price}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{data.unitsCount}</p>
        <span
          data-no-nav
          className="text-primary text-[11px] font-medium mt-1 hover:underline cursor-pointer"
          onClick={e => { e.stopPropagation(); navigate(`/zhk/${slug}`); }}
        >
          Подробнее
        </span>
      </div>
    </div>
  );
};

export default ZhkCard;
