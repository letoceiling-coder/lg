import { useState } from 'react';
import { MapPin, Building2, CalendarDays, Shield, ChevronLeft, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

const ComplexHero = ({ complex }: { complex: ResidentialComplex }) => {
  const totalApts = complex.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
  const [imgIdx, setImgIdx] = useState(0);

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      {/* Gallery */}
      <div className="relative h-72 sm:h-96 bg-muted">
        <img
          src={complex.images[imgIdx]}
          alt={complex.name}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-foreground/10" />

        {/* Gallery nav */}
        {complex.images.length > 1 && (
          <>
            <button
              onClick={() => setImgIdx(i => (i - 1 + complex.images.length) % complex.images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center hover:bg-background/90 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setImgIdx(i => (i + 1) % complex.images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center hover:bg-background/90 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5">
              {complex.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={cn('w-2 h-2 rounded-full transition-all', i === imgIdx ? 'bg-primary-foreground w-5' : 'bg-primary-foreground/50')}
                />
              ))}
            </div>
          </>
        )}

        {/* Overlay info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-primary-foreground">
          <div className="flex gap-2 mb-2">
            {complex.status === 'completed' && <span className="px-2.5 py-1 bg-green-500 rounded-full text-xs font-medium">Сдан</span>}
            {complex.status === 'building' && <span className="px-2.5 py-1 bg-primary rounded-full text-xs font-medium">Строится</span>}
            {complex.status === 'planned' && <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">Планируется</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{complex.name}</h1>
          <div className="flex items-center gap-1.5 text-sm opacity-90">
            <MapPin className="w-4 h-4" />
            {complex.address} · м. {complex.subway} · {complex.subwayDistance}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Цена от</p>
            <p className="font-bold text-xl">{formatPrice(complex.priceFrom)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Застройщик</p>
            <p className="font-semibold text-sm flex items-center gap-1.5"><Building2 className="w-4 h-4 text-muted-foreground" />{complex.builder}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Сдача</p>
            <p className="font-semibold text-sm flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-muted-foreground" />{complex.deadline}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Квартир</p>
            <p className="font-semibold text-sm">{totalApts} доступно</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {complex.advantages.map((a, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium flex items-center gap-1.5">
              <Shield className="w-3 h-3" />{a}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="h-11 px-6"><Phone className="w-4 h-4 mr-2" /> Позвонить</Button>
          <Button variant="outline" className="h-11 px-6"><MessageCircle className="w-4 h-4 mr-2" /> Записаться на просмотр</Button>
        </div>
      </div>
    </div>
  );
};

export default ComplexHero;
