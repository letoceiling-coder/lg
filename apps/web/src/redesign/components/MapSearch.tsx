import { useEffect, useRef, useState } from 'react';
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
const DEFAULT_ZOOM = 11;
const PLACEHOLDER = '/placeholder.svg';
const PRICE_LABEL_ZOOM = 12;

interface Props {
  complexes: ResidentialComplex[];
  regionId?: number | null;
  regionCenter?: [number, number] | null;
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  height?: string;
  compact?: boolean;
}

function getAptCount(c: ResidentialComplex) {
  if (c.listingCount != null) return c.listingCount;
  return c.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
}

const MapSearch = ({ complexes, activeSlug, onSelect, height = '70vh', compact, regionCenter }: Props) => {
  const fillParent = Boolean(compact) || height === '100%';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const { ready } = useYandexMapsReady();

  const activeComplex = complexes.find(c => c.slug === activeSlug);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: regionCenter ?? DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      controls: ['zoomControl'],
    });
    mapInstance.current.events.add('boundschange', () => {
      const nextZoom = mapInstance.current?.getZoom?.();
      if (typeof nextZoom === 'number') setZoom(nextZoom);
    });
  }, [ready, regionCenter]);

  useEffect(() => {
    if (!mapInstance.current || !regionCenter) return;
    mapInstance.current.setCenter(regionCenter);
  }, [regionCenter]);

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
    const showPriceLabels = zoom >= PRICE_LABEL_ZOOM;

    complexes.forEach(c => {
      const aptCount = getAptCount(c);
      const isActive = c.slug === activeSlug;

      // Custom layout for marker with apartment count
      const priceLabel = c.priceFrom > 0
        ? `от ${c.priceFrom >= 1e6 ? (c.priceFrom / 1e6).toFixed(1) + ' млн' : Math.round(c.priceFrom / 1e3) + ' тыс'}`
        : `${aptCount} кв.`;

      const color = isActive ? '#ef4444' : '#2563EB';
      const layout = window.ymaps.templateLayoutFactory.createClass(
        showPriceLabels
          ? `<div style="
              background: ${color};
              color: #ffffff;
              padding: 6px 10px;
              border-radius: 999px;
              font-size: 12px;
              line-height: 1;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
              cursor: pointer;
              transform: translate(-50%, -100%);
              border: 2px solid #ffffff;
              position: relative;
            ">${priceLabel}<div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0; height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${color};
              filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.18));
            "></div></div>`
          : `<div style="
              width: ${isActive ? 22 : 16}px;
              height: ${isActive ? 22 : 16}px;
              border-radius: 999px;
              background: ${color};
              border: 3px solid #ffffff;
              box-shadow: 0 8px 20px rgba(37, 99, 235, 0.32);
              cursor: pointer;
              transform: translate(-50%, -50%);
            "></div>`
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
  }, [complexes, ready, activeSlug, onSelect, zoom]);


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
              <img
                src={activeComplex.images[0] || PLACEHOLDER}
                alt=""
                className="w-full h-[120px] object-cover"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-sm truncate">{activeComplex.name}</h3>
                  <span className="font-bold text-sm text-primary shrink-0">
                    {formatPrice(activeComplex.priceFrom) === 'Цена по запросу'
                      ? 'Цена по запросу'
                      : `от ${formatPrice(activeComplex.priceFrom)}`}
                  </span>
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