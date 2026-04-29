import { useEffect, useRef } from 'react';
import { useYandexMapsReady } from '@/shared/hooks/useYandexMapsReady';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MapPin, X } from 'lucide-react';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const REGION_CENTERS: Record<number, [number, number]> = {
  1: [55.751244, 37.618423],
  2: [59.939095, 30.315868],
  3: [45.035470, 38.975313],
  4: [56.838002, 60.597295],
  5: [54.989347, 82.904635],
  6: [55.796127, 49.106405],
  7: [50.595414, 36.587277],
};
const DEFAULT_ZOOM = 11;

export interface ListingMapItem {
  id: number;
  lat: number | string;
  lng: number | string;
  price: string | number | null;
  title: string | null;
  kind: string;
  address: string | null;
  photoUrl?: string | null;
  slug?: string;
}

function formatPriceShort(price: string | number | null): string {
  if (!price) return '—';
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс`;
  return String(n);
}

interface Props {
  listings: ListingMapItem[];
  regionId?: number | null;
  activeId?: number | null;
  onSelect?: (id: number | null) => void;
  height?: string;
  compact?: boolean;
}

const ListingsMapSearch = ({ listings, regionId, activeId, onSelect, height = '70vh', compact }: Props) => {
  const fillParent = Boolean(compact) || height === '100%';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const { ready } = useYandexMapsReady();

  const active = listings.find((l) => l.id === activeId);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    const regionCenter = (regionId && REGION_CENTERS[regionId]) ?? DEFAULT_CENTER;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: regionCenter,
      zoom: DEFAULT_ZOOM,
      controls: ['zoomControl'],
    });
  }, [ready, regionId]);

  // Render markers
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;

    if (clustererRef.current) {
      map.geoObjects.remove(clustererRef.current);
      clustererRef.current = null;
    }

    const validListings = listings.filter(
      (l) => l.lat != null && l.lng != null && parseFloat(String(l.lat)) !== 0,
    );

    if (validListings.length === 0) return;

    const clusterer = new window.ymaps.Clusterer({
      preset: 'islands#blueCircleClusterIcons',
      clusterIconLayout: 'default#pieChart',
      clusterDisableClickZoom: false,
    });

    const placemarks = validListings.map((l) => {
      const isActive = l.id === activeId;
      const priceLabel = formatPriceShort(l.price);

      const layout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="
          background: #ffffff;
          color: ${isActive ? '#ef4444' : '#1d4ed8'};
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 11px;
          line-height: 1;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(15,23,42,0.18);
          cursor: pointer;
          transform: translate(-50%, -100%);
          border: 2px solid ${isActive ? '#ef4444' : 'rgba(37,99,235,0.5)'};
          position: relative;
        ">${priceLabel}<div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 8px solid ${isActive ? '#ef4444' : '#ffffff'};
          filter: drop-shadow(0 2px 2px rgba(15,23,42,0.15));
        "></div></div>`,
      );

      const pm = new window.ymaps.Placemark(
        [parseFloat(String(l.lat)), parseFloat(String(l.lng))],
        {},
        {
          iconLayout: layout,
          iconShape: { type: 'Rectangle', coordinates: [[-35, -28], [35, 0]] },
        },
      );

      pm.events.add('click', () => onSelect?.(l.id === activeId ? null : l.id));
      return pm;
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);
    clustererRef.current = clusterer;
  }, [listings, ready, activeId, onSelect]);

  // Center on active
  useEffect(() => {
    if (!activeId || !mapInstance.current) return;
    const l = listings.find((x) => x.id === activeId);
    if (l && l.lat && l.lng) {
      mapInstance.current.setCenter(
        [parseFloat(String(l.lat)), parseFloat(String(l.lng))],
        15,
        { duration: 300 },
      );
    }
  }, [activeId, listings]);

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

      {active && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[300px] z-10 animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => onSelect?.(null)}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {active.slug ? (
              <Link to={`/listing/${active.id}`} className="block p-3">
                {active.photoUrl && (
                  <img
                    src={active.photoUrl}
                    alt=""
                    className="w-full h-[100px] object-cover rounded-lg mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <p className="font-semibold text-sm leading-snug">{active.title ?? active.address}</p>
                {active.address && active.title && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{active.address}</span>
                  </div>
                )}
                <p className="text-sm font-bold text-primary mt-1">
                  {formatPriceShort(active.price)} ₽
                </p>
                <span className="text-primary text-[11px] font-medium mt-1 inline-block">Подробнее →</span>
              </Link>
            ) : (
              <Link to={`/listing/${active.id}`} className="block p-3">
                <p className="font-semibold text-sm">{active.title ?? active.address}</p>
                <p className="text-sm font-bold text-primary mt-1">{formatPriceShort(active.price)} ₽</p>
                <span className="text-primary text-[11px] font-medium">Подробнее →</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingsMapSearch;
