import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Heart, GitCompare } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';
import { useAuth } from '@/shared/hooks/useAuth';
import { parseApiBlockId, useFavorites } from '@/shared/hooks/useFavorites';
import { useCompare } from '@/shared/hooks/useCompare';

interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list';
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  building: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', label: 'Строится' },
  completed: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Сдан' },
  planned: { bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]', label: 'Планируется' },
};

const PLACEHOLDER = '/placeholder.svg';

const StatusBadge = ({ status }: { status: string }) => {
  const s = statusStyles[status];
  if (!s) return null;
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-semibold', s.bg, s.text)}>
      {s.label}
    </span>
  );
};

const ComplexCard = ({ complex, variant = 'grid' }: Props) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isBlockFavorite, toggleBlock } = useFavorites();
  const { isCompared, toggle: toggleCompare } = useCompare();
  const blockNum = parseApiBlockId(complex.id);
  const liked = blockNum != null && isBlockFavorite(blockNum);
  const inCompare = isCompared(complex.slug);
  const hasBuilder = Boolean(complex.builder && complex.builder !== '—');
  const hasDeadline = Boolean(complex.deadline && complex.deadline !== '—');
  const fromBuildings = complex.buildings.reduce(
    (s, b) => s + b.apartments.filter((a) => a.status === 'available').length,
    0,
  );
  const totalApts = Math.max(complex.listingCount ?? 0, fromBuildings);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blockNum == null) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    void toggleBlock(blockNum);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(complex.slug);
  };

  if (variant === 'list') {
    return (
      <Link
        to={`/complex/${complex.slug}`}
        className="group flex rounded-xl overflow-hidden bg-card border border-border transition-all duration-200 hover:shadow-md"
      >
        <div className="relative w-[220px] shrink-0 overflow-hidden bg-muted">
          <img
            src={complex.images[0] || PLACEHOLDER}
            alt={complex.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
          <StatusBadge status={complex.status} />
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            <button
              type="button"
              title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
              className="w-7 h-7 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={handleCompare}
            >
              <GitCompare className={cn('w-3.5 h-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
            </button>
            <button
              type="button"
              title="Избранное"
              className="w-7 h-7 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={handleLike}
            >
              <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">{complex.name}</h3>
            <p className="text-sm font-bold mt-1">
              {formatPrice(complex.priceFrom) === 'Цена по запросу' ? 'Цена по запросу' : `от ${formatPrice(complex.priceFrom)}`}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{complex.district} · {complex.address}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalApts} квартир{hasDeadline ? ` · Сдача ${complex.deadline}` : ''}
            </p>
          </div>
          <span className="text-primary text-[11px] font-medium mt-1">Подробнее →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/complex/${complex.slug}`}
      className="group flex flex-col h-[390px] rounded-xl overflow-hidden bg-card border border-border transition-all duration-200 hover:shadow-md hover:-translate-y-px"
    >
      {/* Image */}
      <div className="relative shrink-0 overflow-hidden h-[160px]">
        <img
          src={complex.images[currentImageIndex] || complex.images[0] || PLACEHOLDER}
          alt={complex.name}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
        <div className="absolute top-2 left-2">
          <StatusBadge status={complex.status} />
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button
            type="button"
            title={inCompare ? 'Убрать из сравнения' : 'В сравнение'}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-sm hover:bg-background/90"
            onClick={handleCompare}
          >
            <GitCompare className={cn('w-3.5 h-3.5', inCompare ? 'text-primary' : 'text-muted-foreground')} />
          </button>
          <button
            type="button"
            title="Избранное"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-sm hover:bg-background/90"
            onClick={handleLike}
          >
            <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        </div>
        {complex.images.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {complex.images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  index === currentImageIndex ? 'bg-background' : 'bg-background/40'
                )}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(index); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-[16px] leading-tight truncate">{complex.name}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">
            {(() => {
              const formatted = formatPrice(complex.priceFrom);
              return formatted === 'Цена по запросу' ? formatted : `от ${formatted}`;
            })()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{complex.address}</span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">м. {complex.subway} · {complex.subwayDistance}</p>
        {hasBuilder ? (
          <p className="text-[11px] text-muted-foreground truncate">Застройщик: {complex.builder}</p>
        ) : null}
        <div className="pt-2 mt-auto border-t border-border/70 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Квартир</span>
            <span className="font-medium">{totalApts}</span>
          </div>
          {hasDeadline ? (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Сдача</span>
              <span className="font-medium">{complex.deadline}</span>
            </div>
          ) : null}
          <span className="text-primary text-[11px] font-medium hover:underline">Подробнее</span>
        </div>
      </div>
    </Link>
  );
};

export default ComplexCard;
