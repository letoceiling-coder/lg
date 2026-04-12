import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';
import { MapPin, X } from 'lucide-react';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const DEFAULT_ZOOM = 11;

interface Props {
  complexes: ResidentialComplex[];
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  height?: string;
  compact?: boolean;
}

function getAptCount(c: ResidentialComplex) {
  if (c.listingCount != null) return c.listingCount;
  return c.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
}

const MapSearch = ({ complexes, activeSlug, onSelect, height = '70vh', compact }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  const activeComplex = complexes.find(c => c.slug === activeSlug);

  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setReady(true)); return; }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => setReady(true));
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      controls: ['zoomControl'],
    });
  }, [ready]);

  // Update markers when complexes change
  useEffect(() => {
    if (!mapInstance.current || !ready) return;
    const map = mapInstance.current;
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    complexes.forEach(c => {
      const aptCount = getAptCount(c);
      const isActive = c.slug === activeSlug;

      // Custom layout for marker with apartment count
      const priceLabel = c.priceFrom > 0
        ? `от ${c.priceFrom >= 1e6 ? (c.priceFrom / 1e6).toFixed(1) + ' млн' : Math.round(c.priceFrom / 1e3) + ' тыс'}`
        : `${aptCount} кв.`;

      const layout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="
          background: ${isActive ? '#2563EB' : '#1e293b'};
          color: #fff;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          cursor: pointer;
          transform: translate(-50%, -100%);
          border: 2px solid ${isActive ? '#1d4ed8' : 'rgba(255,255,255,0.2)'};
          position: relative;
        ">${priceLabel}<div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${isActive ? '#2563EB' : '#1e293b'};
        "></div></div>`
      );

      const pm = new window.ymaps.Placemark(c.coords, {}, {
        iconLayout: layout,
        iconShape: {
          type: 'Rectangle',
          coordinates: [[-40, -30], [40, 0]],
        },
      });

      pm.events.add('click', () => onSelect?.(c.slug));
      map.geoObjects.add(pm);
      markersRef.current.push(pm);
    });
  }, [complexes, ready, activeSlug, onSelect]);

  // Center on active
  useEffect(() => {
    if (!activeSlug || !mapInstance.current) return;
    const c = complexes.find(x => x.slug === activeSlug);
    if (c) mapInstance.current.setCenter(c.coords, 14, { duration: 300 });
  }, [activeSlug, complexes]);

  return (
    <div className={cn('relative', compact ? 'h-full' : '')} style={compact ? undefined : { height }}>
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden border border-border bg-muted min-h-[300px]" />

      {/* Floating card when a complex is selected */}
      {activeComplex && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] z-10 animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => onSelect?.(null)}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <Link to={`/complex/${activeComplex.slug}`} className="block">
              <img src={activeComplex.images[0]} alt="" className="w-full h-[120px] object-cover" />
              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-sm truncate">{activeComplex.name}</h3>
                  <span className="font-bold text-sm text-primary shrink-0">от {formatPrice(activeComplex.priceFrom)}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{activeComplex.district} · м. {activeComplex.subway}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{getAptCount(activeComplex)} квартир в продаже</p>
                <span className="text-primary text-[11px] font-medium mt-1 inline-block">Подробнее →</span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSearch;