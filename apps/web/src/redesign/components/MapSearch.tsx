import { useEffect, useRef, useCallback } from 'react';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';
import { MapPin, X } from 'lucide-react';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
// Known region centers (fallback when no complexes have coords)
const REGION_CENTERS: Record<number, [number, number]> = {
  1: [55.751244, 37.618423], // Москва
  2: [59.939095, 30.315868], // Санкт-Петербург
  3: [45.035470, 38.975313], // Краснодар
  4: [56.838002, 60.597295], // Екатеринбург
  5: [54.989347, 82.904635], // Новосибирск
  6: [55.796127, 49.106405], // Казань
  7: [50.595414, 36.587277], // Белгород
};
const DEFAULT_ZOOM = 11;

interface Props {
  complexes: ResidentialComplex[];
  regionId?: number | null;
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  height?: string;
  compact?: boolean;
}

function getAptCount(c: ResidentialComplex) {
  if (c.listingCount != null) return c.listingCount;
  return c.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
}

const MapSearch = ({ complexes, activeSlug, onSelect, height = '70vh', compact, regionId }: Props) => {
  const fillParent = Boolean(compact) || height === '100%';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { ready } = useYandexMapsReady();

  const activeComplex = complexes.find(c => c.slug === activeSlug);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    const regionCenter = (regionId && REGION_CENTERS[regionId]) ?? DEFAULT_CENTER;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: regionCenter, zoom: DEFAULT_ZOOM,
      controls: ['zoomControl'],
    });
  }, [ready]);

  // Update markers when complexes change
  useEffect(() => {
    if (!mapInstance.current || !ready) return;
    const map = mapInstance.current;

    // Reset previous clusterer
    if (clustererRef.current) {
      map.geoObjects.remove(clustererRef.current);
      clustererRef.current = null;
    }

    const clusterer = new window.ymaps.Clusterer({
      preset: 'islands#invertedBlueClusterIcons',
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterOpenBalloonOnClick: false,
    });

    const placemarks: any[] = [];

    complexes.forEach(c => {
      const aptCount = getAptCount(c);
      const isActive = c.slug === activeSlug;

      // Custom layout for marker with apartment count
      const priceLabel = c.priceFrom > 0
        ? `от ${c.priceFrom >= 1e6 ? (c.priceFrom / 1e6).toFixed(1) + ' млн' : Math.round(c.priceFrom / 1e3) + ' тыс'}`
        : `${aptCount} кв.`;

      const layout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="
          background: ${isActive ? '#ffffff' : '#ffffff'};
          color: ${isActive ? '#ef4444' : '#1d4ed8'};
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.2px;
          white-space: nowrap;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.20);
          cursor: pointer;
          transform: translate(-50%, -100%);
          border: 2px solid ${isActive ? '#ef4444' : 'rgba(37, 99, 235, 0.55)'};
          text-shadow: ${isActive ? 'none' : 'none'};
          position: relative;
        ">${priceLabel}<div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${isActive ? '#ef4444' : '#ffffff'};
          filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.18));
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
      placemarks.push(pm);
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);
    clustererRef.current = clusterer;
  }, [complexes, ready, activeSlug, onSelect]);


  // Center on active
  useEffect(() => {
    if (!activeSlug || !mapInstance.current) return;
    const c = complexes.find(x => x.slug === activeSlug);
    if (c) mapInstance.current.setCenter(c.coords, 14, { duration: 300 });
  }, [activeSlug, complexes]);

  return (
    <div
      className={cn('relative', fillParent ? 'h-full min-h-0' : '')}
      style={fillParent ? undefined : { height }}
    >
      <div
        ref={mapRef}
        className={cn(
          'h-full w-full rounded-xl border border-border bg-muted',
          fillParent ? 'min-h-0 overflow-hidden' : 'min-h-[300px] overflow-hidden',
        )}
      />

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