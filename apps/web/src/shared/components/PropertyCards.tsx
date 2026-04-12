import { Link } from 'react-router-dom';
import { MapPin, Heart, Home, TreePine, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MockApartment, MockHouse, MockLand, MockCommercial } from '@/shared/data/catalog-mock';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  building: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', label: 'Строится' },
  completed: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Сдан' },
  planned: { bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]', label: 'Проект' },
};

const CardImage = ({ src, alt, badge, className }: { src: string; alt: string; badge?: React.ReactNode; className?: string }) => (
  <div className={cn('relative overflow-hidden bg-muted', className)}>
    <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
    {badge && <div className="absolute top-2 left-2">{badge}</div>}
  </div>
);

/* === Apartment Card === */
export const ApartmentCard = ({ item, variant = 'grid' }: { item: MockApartment; variant?: 'grid' | 'list' }) => {
  const roomLabel = item.rooms === 'studio' ? 'Студия' : `${item.rooms}-комн.`;

  if (variant === 'list') {
    return (
      <Link to={`/apartment/${item.id}`} className="group flex rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all">
        <CardImage src={item.image} alt={roomLabel} className="w-[220px] shrink-0 h-[140px]" />
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{roomLabel}, {item.area} м²</h3>
              <span className="text-xs text-muted-foreground">этаж {item.floor}/{item.totalFloors}</span>
            </div>
            <p className="text-sm font-bold mt-1 text-primary">{item.priceLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{item.complexName} · {item.address}</p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>м. {item.subway} · {item.district}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted">{item.finishing}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted">{item.deadline}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/apartment/${item.id}`} className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all">
      <CardImage src={item.image} alt={roomLabel} className="h-[160px]" />
      <div className="p-3 space-y-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm">{roomLabel}, {item.area} м²</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{item.priceLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">этаж {item.floor}/{item.totalFloors} · {item.finishing}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.complexName} · м. {item.subway}</p>
        <span className="text-primary text-[11px] font-medium">Подробнее</span>
      </div>
    </Link>
  );
};

/* === House Card === */
export const HouseCard = ({ item, variant = 'grid' }: { item: MockHouse; variant?: 'grid' | 'list' }) => {
  const badge = statusStyles[item.status];

  if (variant === 'list') {
    return (
      <div className="group flex rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all">
        <CardImage
          src={item.image}
          alt={item.title}
          className="w-[220px] shrink-0 h-[140px]"
          badge={badge && <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-semibold', badge.bg, badge.text)}>{badge.label}</span>}
        />
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-sm">{item.title}</h3>
            <p className="text-sm font-bold mt-1 text-primary">{item.priceLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              <Home className="w-3 h-3 inline mr-1" />{item.houseArea} м² дом · {item.landArea} сот. участок
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.material} · {item.address}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all">
      <CardImage
        src={item.image}
        alt={item.title}
        className="h-[160px]"
        badge={badge && <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-semibold', badge.bg, badge.text)}>{badge.label}</span>}
      />
      <div className="p-3 space-y-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm truncate">{item.title}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{item.priceLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{item.houseArea} м² · {item.landArea} сот. · {item.material}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.address}</p>
      </div>
    </div>
  );
};

/* === Land Card === */
export const LandCard = ({ item, variant = 'grid' }: { item: MockLand; variant?: 'grid' | 'list' }) => {
  if (variant === 'list') {
    return (
      <div className="group flex rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all">
        <CardImage src={item.image} alt={item.title} className="w-[220px] shrink-0 h-[140px]"
          badge={<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">{item.purpose}</span>}
        />
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-sm">{item.title}</h3>
            <p className="text-sm font-bold mt-1 text-primary">{item.priceLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              <TreePine className="w-3 h-3 inline mr-1" />{item.area} соток · {item.purpose}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.address}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all">
      <CardImage src={item.image} alt={item.title} className="h-[160px]"
        badge={<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">{item.purpose}</span>}
      />
      <div className="p-3 space-y-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm truncate">{item.title}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{item.priceLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{item.area} сот. · {item.purpose}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.address}</p>
      </div>
    </div>
  );
};

/* === Commercial Card === */
export const CommercialCard = ({ item, variant = 'grid' }: { item: MockCommercial; variant?: 'grid' | 'list' }) => {
  if (variant === 'list') {
    return (
      <div className="group flex rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition-all">
        <CardImage src={item.image} alt={item.title} className="w-[220px] shrink-0 h-[140px]"
          badge={<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#EA580C]">{item.type}</span>}
        />
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-sm">{item.title}</h3>
            <p className="text-sm font-bold mt-1 text-primary">{item.priceLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              <Store className="w-3 h-3 inline mr-1" />{item.area} м² · {item.type}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.address} · {item.district}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border hover:shadow-md hover:-translate-y-px transition-all">
      <CardImage src={item.image} alt={item.title} className="h-[160px]"
        badge={<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#EA580C]">{item.type}</span>}
      />
      <div className="p-3 space-y-0.5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm truncate">{item.title}</h3>
          <span className="font-bold text-sm shrink-0 text-primary">{item.priceLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{item.area} м² · {item.type}</p>
        <p className="text-[11px] text-muted-foreground truncate">{item.address}</p>
      </div>
    </div>
  );
};
